# Schedule an expiry

The whole flow in code, with viem. Nothing here needs the reference interface.

## Setup

```bash
npm install viem
```

```typescript
import {
  createPublicClient, createWalletClient, custom, defineChain, http,
  encodeAbiParameters, keccak256, parseAbiItem, parseAbiParameters,
  parseEther, parseSignature, stringToHex, type Address,
} from "viem";

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
});

const REGISTRY = "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1" as const;
const LENS     = "0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395" as const;

const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
```

## Step 1: check the pair is workable

Two things have to be true before it is worth spending gas: the allowance is not already zero,
and the token supports the canonical permit.

```typescript
const lensAbi = [
  parseAbiItem("function probePermit(address,address) view returns (bool,uint256)"),
  parseAbiItem("function tryAllowance(address,address,address) view returns (bool,uint256)"),
];

const [permitLikely, nonce] = await pub.readContract({
  address: LENS, abi: lensAbi, functionName: "probePermit", args: [token, owner],
});
const [ok, allowance] = await pub.readContract({
  address: LENS, abi: lensAbi, functionName: "tryAllowance", args: [token, owner, spender],
});

if (!ok || allowance === 0n) throw new Error("nothing to expire");
if (!permitLikely) throw new Error("token has no permit surface");
```

## Step 2: resolve the EIP 712 domain

**This is the step people get wrong.** Do not guess `name` or `version`. Build candidates and
check each against the token's own separator.

```typescript
const DOMAIN_TYPEHASH =
  "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f";

function computeSeparator(d: {
  name: string; version: string; chainId: number; verifyingContract: Address;
}) {
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

const erc20 = [
  parseAbiItem("function name() view returns (string)"),
  parseAbiItem("function version() view returns (string)"),
  parseAbiItem("function DOMAIN_SEPARATOR() view returns (bytes32)"),
];

async function resolveDomain(token: Address) {
  const read = (fn: string) =>
    pub.readContract({ address: token, abi: erc20, functionName: fn }).catch(() => null);

  const [onChain, name, version] = await Promise.all([
    read("DOMAIN_SEPARATOR"), read("name"), read("version"),
  ]);
  if (!onChain) return null;

  for (const n of [name, ""].filter((x): x is string => x !== null)) {
    for (const v of [version, "1", "2"].filter((x): x is string => x !== null)) {
      const candidate = { name: n, version: v, chainId: 4663, verifyingContract: token };
      if (computeSeparator(candidate).toLowerCase() === String(onChain).toLowerCase()) {
        return candidate;
      }
    }
  }
  return null;
}

const domain = await resolveDomain(token);
if (!domain) throw new Error("cannot resolve the permit domain, refusing to schedule");
```

If no candidate matches, stop. A signature built on a guessed domain will never verify, and the
job would sit there with the bounty stuck until cancelled.

## Step 3: pick the times

```typescript
const block = await pub.getBlock();
const expiresAt = block.timestamp + 604800n;              // seven days

// A decade past the expiry. Setting this equal to expiresAt would leave a one
// second execution window, which is a real trap. See the permit page.
const permitDeadline = expiresAt + 10n * 365n * 24n * 60n * 60n;
```

## Step 4: sign the permit

Value is always zero.

```typescript
const signature = await wallet.signTypedData({
  account: owner,
  domain,
  types: {
    Permit: [
      { name: "owner",    type: "address" },
      { name: "spender",  type: "address" },
      { name: "value",    type: "uint256" },
      { name: "nonce",    type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  message: { owner, spender, value: 0n, nonce, deadline: permitDeadline },
});

const { r, s, v, yParity } = parseSignature(signature);
const vByte = Number(v ?? BigInt(yParity === 1 ? 28 : 27));
```

This costs nothing and touches no chain.

## Step 5: size the bounty

```typescript
const gasPrice = await pub.getGasPrice();
const breakEven = gasPrice * 120_000n;  // execute measured at 98,274 gas
const bounty = breakEven * 3n;
```

Below break even, no keeper will run it. See [Keepers and bounties](../protocol/keepers.md).

## Step 6: simulate, then send

Simulating first means a doomed job never costs gas.

```typescript
const registryAbi = [
  parseAbiItem(
    "function scheduleExpiry(address token, address spender, uint256 expiresAt, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable returns (uint256)"
  ),
];

const { request } = await pub.simulateContract({
  account: owner,
  address: REGISTRY,
  abi: registryAbi,
  functionName: "scheduleExpiry",
  args: [token, spender, expiresAt, permitDeadline, vByte, r, s],
  value: bounty,
});

const hash = await wallet.writeContract(request);
await pub.waitForTransactionReceipt({ hash });
```

`simulateContract` preserves `value`, so the bounty travels with the request.

## Reading your jobs back

`owner` is an indexed event parameter, so one log query returns everything you ever scheduled.

```typescript
const logs = await pub.getLogs({
  address: REGISTRY,
  event: parseAbiItem(
    "event ScheduleCreated(uint256 indexed jobId, address indexed owner, address indexed token, address spender, uint256 expiresAt, uint256 permitDeadline, uint256 bounty)"
  ),
  args: { owner },
  fromBlock: 58736296n,
  toBlock: "latest",
});

const ids = logs.map((l) => l.args.jobId!);
```

Then batch the current state through Multicall3:

```typescript
const jobs = await pub.multicall({
  contracts: ids.map((id) => ({
    address: REGISTRY,
    abi: [parseAbiItem("function getJob(uint256) view returns ((address,uint8,bool,bool,address,address,uint256,uint256,bytes32,bytes32,uint256))")],
    functionName: "getJob",
    args: [id],
  })),
  allowFailure: true,
});
```

## Detecting a dead signature

Compare the token's nonce now against the one you signed with.

```typescript
const [, currentNonce] = await pub.readContract({
  address: LENS, abi: lensAbi, functionName: "probePermit", args: [token, owner],
});

if (currentNonce > nonceWhenScheduled) {
  // this job can never run. cancel and reschedule.
}
```

## Cancelling

```typescript
const { request } = await pub.simulateContract({
  account: owner,
  address: REGISTRY,
  abi: [parseAbiItem("function cancel(uint256 jobId)")],
  functionName: "cancel",
  args: [jobId],
});
await wallet.writeContract(request);
```

The bounty comes straight back. The underlying approval is untouched.
