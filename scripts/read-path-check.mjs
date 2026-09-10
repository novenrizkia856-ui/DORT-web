import { createPublicClient, defineChain, http, parseAbiItem } from "viem";
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const REGISTRY = "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1";
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } }, contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } } });
const pub = createPublicClient({ chain, transport: http(RPC, { batch: true }) });
const SC = parseAbiItem("event ScheduleCreated(uint256 indexed jobId, address indexed owner, address indexed token, address spender, uint256 expiresAt, uint256 permitDeadline, uint256 bounty)");
const reg = [parseAbiItem("function nextJobId() view returns (uint256)"), parseAbiItem("function isExecutable(uint256) view returns (bool)")];

console.log("  block now            :", await pub.getBlockNumber());
console.log("  nextJobId on mainnet :", await pub.readContract({ address: REGISTRY, abi: reg, functionName: "nextJobId" }));
const logs = await pub.getLogs({ address: REGISTRY, event: SC, args: { owner: "0x28d836E46c698Ccc530B4D981b089eC14bE39757" }, fromBlock: 58736296n, toBlock: "latest" });
console.log("  getLogs owner filter :", logs.length, "results (0 expected, nothing scheduled yet)");
const mc = await pub.multicall({ contracts: [{ address: REGISTRY, abi: reg, functionName: "nextJobId" }], allowFailure: true });
console.log("  multicall3 works     :", mc[0].status);
console.log("  gas price            :", await pub.getGasPrice(), "wei");
console.log("\n  READ PATH OK against live mainnet.");
