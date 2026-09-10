import {
  encodeAbiParameters,
  keccak256,
  parseAbiItem,
  parseAbiParameters,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { publicClient, REGISTRY, LENS, REGISTRY_DEPLOY_BLOCK } from "./chain";
import { erc20Abi, lensAbi, registryAbi } from "./abi";
import { NETWORK } from "@/config/contracts";

/* -------------------------------------------------------------------------- */
/*                              EIP 2612 domain                               */
/* -------------------------------------------------------------------------- */

/** keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)") */
const DOMAIN_TYPEHASH =
  "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f" as const;

export type PermitDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
};

function computeDomainSeparator(d: PermitDomain): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, bytes32, bytes32, uint256, address"), [
      DOMAIN_TYPEHASH,
      keccak256(stringToHex(d.name)),
      keccak256(stringToHex(d.version)),
      BigInt(d.chainId),
      d.verifyingContract,
    ])
  );
}

/**
 * Works out the exact EIP 712 domain a token signs under, by trying the plausible candidates and
 * checking each against the token's own `DOMAIN_SEPARATOR()`.
 *
 * This matters more than it looks. The domain is part of what gets hashed, so a wrong `name` or
 * `version` produces a signature the token will never accept. The job would then sit on chain
 * until its owner cancels it, with the bounty stuck in the meantime. Guessing is not good enough,
 * so nothing is scheduled unless a candidate reproduces the token's own separator exactly.
 */
export async function resolvePermitDomain(token: Address): Promise<PermitDomain | null> {
  const [onChainSeparator, name, version] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: "DOMAIN_SEPARATOR" }),
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: "name" }).catch(() => null),
    publicClient
      .readContract({ address: token, abi: erc20Abi, functionName: "version" })
      .catch(() => null),
  ]);

  if (!onChainSeparator) return null;

  const names = [name, ""].filter((n): n is string => n !== null);
  const versions = [version, "1", "2"].filter((v): v is string => v !== null);

  for (const n of names) {
    for (const v of versions) {
      const candidate: PermitDomain = {
        name: n,
        version: v,
        chainId: NETWORK.chainIdMainnet,
        verifyingContract: token,
      };
      if (computeDomainSeparator(candidate).toLowerCase() === onChainSeparator.toLowerCase()) {
        return candidate;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                              Token inspection                              */
/* -------------------------------------------------------------------------- */

export type TokenCheck = {
  token: Address;
  spender: Address;
  name: string;
  symbol: string;
  decimals: number;
  allowance: bigint;
  nonce: bigint;
  permitLikely: boolean;
  /** Null when no candidate domain reproduced the token's own separator. */
  domain: PermitDomain | null;
};

/** Everything the form needs to decide whether this pair can be protected. */
export async function inspectPair(
  token: Address,
  owner: Address,
  spender: Address
): Promise<TokenCheck> {
  const [meta, probe, allowanceResult] = await Promise.all([
    Promise.all([
      publicClient.readContract({ address: token, abi: erc20Abi, functionName: "name" }).catch(() => "Unknown"),
      publicClient.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "???"),
      publicClient
        .readContract({ address: token, abi: erc20Abi, functionName: "decimals" })
        .catch(() => 18),
    ]),
    publicClient.readContract({
      address: LENS,
      abi: lensAbi,
      functionName: "probePermit",
      args: [token, owner],
    }),
    publicClient.readContract({
      address: LENS,
      abi: lensAbi,
      functionName: "tryAllowance",
      args: [token, owner, spender],
    }),
  ]);

  const [name, symbol, decimals] = meta;
  const [permitLikely, nonce] = probe;
  const [, allowance] = allowanceResult;

  // Only bother resolving the domain when the token looks like it has one at all.
  const domain = permitLikely ? await resolvePermitDomain(token).catch(() => null) : null;

  return {
    token,
    spender,
    name,
    symbol,
    decimals: Number(decimals),
    allowance,
    nonce,
    permitLikely,
    domain,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Timing and bounty                             */
/* -------------------------------------------------------------------------- */

/**
 * Ten years past the expiry.
 *
 * The registry only requires `permitDeadline >= expiresAt`, but a permit is rejected once
 * `block.timestamp > deadline`. Setting the two equal would leave a one second window in which
 * the job could run, and it would be dead from the next second onward. The signature is useless
 * for anything except zeroing an allowance the user already wants gone, so a long deadline costs
 * nothing and removes the trap entirely. Audit finding M-02.
 */
export const PERMIT_DEADLINE_BUFFER = 10n * 365n * 24n * 60n * 60n;

export function permitDeadlineFor(expiresAt: bigint): bigint {
  return expiresAt + PERMIT_DEADLINE_BUFFER;
}

/**
 * Gas an `execute` call costs.
 *
 * Measured, not guessed: a full run against a fork of mainnet, using the deployed registry and a
 * canonical permit token, used 98,274 gas. The figure below carries about twenty percent
 * headroom for tokens whose `permit` does more work than the reference one.
 *
 * See scripts/verify-frontend-flow.mjs, which is where the measurement comes from.
 */
export const EXECUTE_GAS_ESTIMATE = 120_000n;

export type BountyGuidance = {
  gasPrice: bigint;
  breakEven: bigint;
  suggested: bigint;
};

/**
 * Works out what a keeper would need to bother running the job.
 *
 * A bounty below the gas cost of executing means no rational keeper ever picks the job up, so the
 * approval never expires on its own. That is a worse outcome than not scheduling at all, because
 * the user believes they are protected. Audit finding M-06.
 */
export async function bountyGuidance(): Promise<BountyGuidance> {
  const gasPrice = await publicClient.getGasPrice();
  const breakEven = gasPrice * EXECUTE_GAS_ESTIMATE;
  return { gasPrice, breakEven, suggested: breakEven * 3n };
}

/* -------------------------------------------------------------------------- */
/*                                  Jobs                                      */
/* -------------------------------------------------------------------------- */

/** Parsed once so `getLogs` can type its `args` filter against the indexed parameters. */
const SCHEDULE_CREATED = parseAbiItem(
  "event ScheduleCreated(uint256 indexed jobId, address indexed owner, address indexed token, address spender, uint256 expiresAt, uint256 permitDeadline, uint256 bounty)"
);

export type Job = {
  id: bigint;
  owner: Address;
  token: Address;
  spender: Address;
  expiresAt: bigint;
  permitDeadline: bigint;
  bounty: bigint;
  executed: boolean;
  cancelled: boolean;
  /** The token's nonce now. When it is past the job's, the stored signature is dead. */
  currentNonce: bigint | null;
  nonceAtSchedule: bigint | null;
  symbol: string;
};

export type JobStatus = "waiting" | "ready" | "executed" | "cancelled" | "stale";

export function jobStatus(job: Job, now: bigint): JobStatus {
  if (job.executed) return "executed";
  if (job.cancelled) return "cancelled";
  if (job.currentNonce !== null && job.nonceAtSchedule !== null && job.currentNonce > job.nonceAtSchedule) {
    return "stale";
  }
  return now >= job.expiresAt ? "ready" : "waiting";
}

/**
 * Every job an address has created.
 *
 * `owner` is an indexed event parameter, so the whole set comes back from one log query rather
 * than by walking `nextJobId` and reading each entry.
 */
export async function jobsForOwner(owner: Address): Promise<Job[]> {
  const logs = await publicClient.getLogs({
    address: REGISTRY,
    event: SCHEDULE_CREATED,
    args: { owner },
    fromBlock: REGISTRY_DEPLOY_BLOCK,
    toBlock: "latest",
  });

  const ids = logs
    .map((l) => l.args.jobId)
    .filter((v): v is bigint => v !== undefined);

  return hydrateJobs(ids);
}

/** Reads current on chain state for a set of job ids, plus the token nonce for staleness. */
export async function hydrateJobs(ids: bigint[]): Promise<Job[]> {
  if (ids.length === 0) return [];

  const raw = await publicClient.multicall({
    contracts: ids.map((id) => ({
      address: REGISTRY,
      abi: registryAbi,
      functionName: "getJob",
      args: [id],
    })),
    allowFailure: true,
  });

  const jobs: Job[] = [];
  for (let i = 0; i < ids.length; i++) {
    const r = raw[i];
    if (r.status !== "success" || !r.result) continue;
    const j = r.result as unknown as {
      owner: Address;
      executed: boolean;
      cancelled: boolean;
      token: Address;
      spender: Address;
      expiresAt: bigint;
      permitDeadline: bigint;
      bounty: bigint;
    };
    jobs.push({
      id: ids[i],
      owner: j.owner,
      token: j.token,
      spender: j.spender,
      expiresAt: j.expiresAt,
      permitDeadline: j.permitDeadline,
      bounty: j.bounty,
      executed: j.executed,
      cancelled: j.cancelled,
      currentNonce: null,
      nonceAtSchedule: null,
      symbol: "",
    });
  }

  // Symbols, one read per distinct token.
  const tokens = [...new Set(jobs.map((j) => j.token))];
  const symbols = await publicClient.multicall({
    contracts: tokens.map((t) => ({ address: t, abi: erc20Abi, functionName: "symbol" })),
    allowFailure: true,
  });
  const symbolByToken = new Map<Address, string>();
  tokens.forEach((t, i) => {
    const r = symbols[i];
    symbolByToken.set(t, r.status === "success" ? String(r.result) : "???");
  });
  jobs.forEach((j) => {
    j.symbol = symbolByToken.get(j.token) ?? "???";
  });

  return jobs.sort((a, b) => Number(b.id - a.id));
}

/** Job ids that anyone could execute right now, for the keeper view. */
export async function executableJobs(limit = 40): Promise<Job[]> {
  const next = await publicClient.readContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: "nextJobId",
  });
  if (next === 0n) return [];

  const start = next > BigInt(limit) ? next - BigInt(limit) : 0n;
  const ids: bigint[] = [];
  for (let i = start; i < next; i++) ids.push(i);

  const flags = await publicClient.multicall({
    contracts: ids.map((id) => ({
      address: REGISTRY,
      abi: registryAbi,
      functionName: "isExecutable",
      args: [id],
    })),
    allowFailure: true,
  });

  const ready = ids.filter(
    (_, i) => flags[i].status === "success" && (flags[i].result as unknown as boolean) === true
  );
  return hydrateJobs(ready);
}

/** Attaches the token nonce to each job so a dead signature can be shown as dead. */
export async function annotateNonces(jobs: Job[], owner: Address): Promise<Job[]> {
  const tokens = [...new Set(jobs.map((j) => j.token))];
  if (tokens.length === 0) return jobs;

  const nonces = await publicClient.multicall({
    contracts: tokens.map((t) => ({
      address: t,
      abi: erc20Abi,
      functionName: "nonces",
      args: [owner],
    })),
    allowFailure: true,
  });

  const byToken = new Map<Address, bigint>();
  tokens.forEach((t, i) => {
    const r = nonces[i];
    if (r.status === "success") byToken.set(t, r.result as unknown as bigint);
  });

  return jobs.map((j) => ({ ...j, currentNonce: byToken.get(j.token) ?? null }));
}
