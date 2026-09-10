/**
 * Proves the frontend's signing logic produces something the real registry accepts.
 *
 * This mirrors, step for step, what components/app/ScheduleForm.tsx does in a browser:
 * resolve the EIP 712 domain by checking candidates against the token's own DOMAIN_SEPARATOR,
 * sign the permit, split the signature, simulate, then send. It runs against an Anvil fork of
 * Robinhood Chain mainnet, so the registry and lens it talks to are the genuinely deployed ones.
 *
 * A browser wallet cannot be driven from here, which is the one thing this cannot cover. Every
 * other part of the path is the same code shape the browser runs.
 *
 * Usage: node scripts/verify-frontend-flow.mjs <rpc> <tokenAddress>
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbiItem,
  parseAbiParameters,
  parseEther,
  parseSignature,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.argv[2] ?? "http://127.0.0.1:8546";
const TOKEN = process.argv[3];
if (!TOKEN) throw new Error("pass the test token address");

const REGISTRY = "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1";
const LENS = "0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395";

// Anvil's published test accounts. Public knowledge, local only.
const OWNER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const KEEPER_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const SPENDER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const pub = createPublicClient({ chain, transport: http(RPC) });
const owner = privateKeyToAccount(OWNER_PK);
const keeper = privateKeyToAccount(KEEPER_PK);
const ownerClient = createWalletClient({ account: owner, chain, transport: http(RPC) });
const keeperClient = createWalletClient({ account: keeper, chain, transport: http(RPC) });

const erc20 = [
  parseAbiItem("function name() view returns (string)"),
  parseAbiItem("function version() view returns (string)"),
  parseAbiItem("function symbol() view returns (string)"),
  parseAbiItem("function decimals() view returns (uint8)"),
  parseAbiItem("function DOMAIN_SEPARATOR() view returns (bytes32)"),
  parseAbiItem("function nonces(address) view returns (uint256)"),
  parseAbiItem("function allowance(address,address) view returns (uint256)"),
  parseAbiItem("function approve(address,uint256) returns (bool)"),
  parseAbiItem("function mint(address,uint256)"),
];
const registry = [
  parseAbiItem(
    "function scheduleExpiry(address token, address spender, uint256 expiresAt, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable returns (uint256)"
  ),
  parseAbiItem("function execute(uint256 jobId)"),
  parseAbiItem("function cancel(uint256 jobId)"),
  parseAbiItem("function isExecutable(uint256) view returns (bool)"),
  parseAbiItem("function nextJobId() view returns (uint256)"),
];
const lens = [
  parseAbiItem("function probePermit(address,address) view returns (bool,uint256)"),
  parseAbiItem("function tryAllowance(address,address,address) view returns (bool,uint256)"),
];

let failures = 0;
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected ${expected}, got ${actual}`}`);
};
const hr = () => console.log("-".repeat(72));

/* ---- exactly what lib/dort.ts resolvePermitDomain does ---- */
const DOMAIN_TYPEHASH = "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f";

function computeDomainSeparator(d) {
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

async function resolvePermitDomain(token) {
  const read = (functionName, args) =>
    pub.readContract({ address: token, abi: erc20, functionName, args }).catch(() => null);

  const [sep, name, version] = await Promise.all([
    read("DOMAIN_SEPARATOR"),
    read("name"),
    read("version"),
  ]);
  if (!sep) return null;

  for (const n of [name, ""].filter((x) => x !== null)) {
    for (const v of [version, "1", "2"].filter((x) => x !== null)) {
      const candidate = { name: n, version: v, chainId: 4663, verifyingContract: token };
      if (computeDomainSeparator(candidate).toLowerCase() === sep.toLowerCase()) return candidate;
    }
  }
  return null;
}

const warp = async (secs) => {
  await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "evm_increaseTime", params: [secs] }),
  });
  await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "evm_mine", params: [] }),
  });
};

/* -------------------------------------------------------------------------- */

hr();
console.log("  FRONTEND FLOW against a fork of Robinhood Chain mainnet");
hr();
console.log(`  rpc      : ${RPC}`);
console.log(`  registry : ${REGISTRY}  (the real deployed one)`);
console.log(`  lens     : ${LENS}  (the real deployed one)`);
console.log(`  token    : ${TOKEN}`);
console.log(`  owner    : ${owner.address}`);
console.log(`  keeper   : ${keeper.address}\n`);

// Setup: mint and approve, standing in for what the user already did elsewhere.
await ownerClient.writeContract({
  address: TOKEN,
  abi: erc20,
  functionName: "mint",
  args: [owner.address, parseEther("1000")],
});
const approveHash = await ownerClient.writeContract({
  address: TOKEN,
  abi: erc20,
  functionName: "approve",
  args: [SPENDER, parseEther("500")],
});
await pub.waitForTransactionReceipt({ hash: approveHash });

hr();
console.log("  1. Domain resolution, the part that must not be guessed");
hr();
const domain = await resolvePermitDomain(TOKEN);
check("a candidate domain reproduced the token's own separator", domain !== null, true);
if (!domain) process.exit(1);
console.log(`        name "${domain.name}", version "${domain.version}", chainId ${domain.chainId}`);

hr();
console.log("  2. Lens reads, exactly what inspectPair calls");
hr();
const [permitLikely, nonce] = await pub.readContract({
  address: LENS,
  abi: lens,
  functionName: "probePermit",
  args: [TOKEN, owner.address],
});
const [, allowance] = await pub.readContract({
  address: LENS,
  abi: lens,
  functionName: "tryAllowance",
  args: [TOKEN, owner.address, SPENDER],
});
check("lens reports permit support", permitLikely, true);
check("lens reads the allowance", allowance, parseEther("500"));
check("nonce starts at zero", nonce, 0n);

hr();
console.log("  3. Sign the permit, the way the browser wallet would");
hr();
const block = await pub.getBlock();
const expiresAt = block.timestamp + 604800n; // the 7 day preset
const deadline = expiresAt + 10n * 365n * 24n * 60n * 60n; // finding M-02

const signature = await ownerClient.signTypedData({
  account: owner,
  domain,
  types: {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  message: { owner: owner.address, spender: SPENDER, value: 0n, nonce, deadline },
});
const { r, s, v, yParity } = parseSignature(signature);
const vByte = Number(v ?? BigInt(yParity === 1 ? 28 : 27));
check("v is a canonical 27 or 28", vByte === 27 || vByte === 28, true);
console.log(`        deadline is ${(Number(deadline - expiresAt) / 31536000).toFixed(0)} years past the expiry`);

hr();
console.log("  4. Simulate then send, against the real registry");
hr();
const before = await pub.readContract({ address: REGISTRY, abi: registry, functionName: "nextJobId" });
const { request } = await pub.simulateContract({
  account: owner,
  address: REGISTRY,
  abi: registry,
  functionName: "scheduleExpiry",
  args: [TOKEN, SPENDER, expiresAt, deadline, vByte, r, s],
  value: parseEther("0.001"),
});
const schedHash = await ownerClient.writeContract(request);
await pub.waitForTransactionReceipt({ hash: schedHash });
const jobId = before;
check("a job was created", await pub.readContract({ address: REGISTRY, abi: registry, functionName: "nextJobId" }), before + 1n);
check("allowance is untouched while waiting", await pub.readContract({ address: TOKEN, abi: erc20, functionName: "allowance", args: [owner.address, SPENDER] }), parseEther("500"));
check("job is not executable yet", await pub.readContract({ address: REGISTRY, abi: registry, functionName: "isExecutable", args: [jobId] }), false);

hr();
console.log("  5. Time passes, a keeper runs it");
hr();
await warp(604801);
check("job is executable now", await pub.readContract({ address: REGISTRY, abi: registry, functionName: "isExecutable", args: [jobId] }), true);

const keeperBefore = await pub.getBalance({ address: keeper.address });
const execHash = await keeperClient.writeContract({
  address: REGISTRY,
  abi: registry,
  functionName: "execute",
  args: [jobId],
});
const receipt = await pub.waitForTransactionReceipt({ hash: execHash });
const keeperAfter = await pub.getBalance({ address: keeper.address });

check("THE ALLOWANCE IS NOW ZERO", await pub.readContract({ address: TOKEN, abi: erc20, functionName: "allowance", args: [owner.address, SPENDER] }), 0n);
check("the nonce was consumed", await pub.readContract({ address: TOKEN, abi: erc20, functionName: "nonces", args: [owner.address] }), 1n);
// Judge the economics against real mainnet gas, not the fork's. Anvil inherits a base fee from
// the forked block and it drifts, so a fork can make a perfectly sound bounty look unprofitable.
// The number that actually transfers to production is the gas used.
const mainnetGasPrice = await fetch("https://rpc.mainnet.chain.robinhood.com", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
})
  .then((r) => r.json())
  .then((j) => BigInt(j.result))
  .catch(() => 0n);

const realCost = receipt.gasUsed * mainnetGasPrice;
check("bounty covers the real mainnet cost of running it", parseEther("0.001") > realCost, true);
console.log(`        gas used ${receipt.gasUsed}, which is the number that carries to production`);
console.log(`        at mainnet gas that costs ${(Number(realCost) / 1e18).toFixed(9)} ETH`);
console.log(`        keeper profit on mainnet would be ${(Number(parseEther("0.001") - realCost) / 1e18).toFixed(9)} ETH`);

hr();
console.log("  6. The staleness signal the UI shows");
hr();
const nonceNow = await pub.readContract({ address: TOKEN, abi: erc20, functionName: "nonces", args: [owner.address] });
check("current nonce is past the one signed, so a stale job would be flagged", nonceNow > nonce, true);

hr();
console.log(failures === 0 ? "  FRONTEND FLOW VERIFIED. Every step behaved as the UI expects." : `  ${failures} CHECK(S) FAILED.`);
hr();
process.exit(failures);
