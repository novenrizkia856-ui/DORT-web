# Run a keeper

About a hundred lines. It earns bounties, and right now it is the thing the protocol most needs.

## Why bother

Two reasons.

The first is money. Each job pays a bounty set by its owner, typically around three times the cost
of running it. Execution costs roughly 0.000016 ETH at current gas.

The second is that **nobody is doing it yet.** DORT's promise is that an approval removes itself
without its owner being there. That is only true if somebody is watching. Until a keeper exists,
scheduled jobs sit until their owners run them by hand, which defeats the point.

## The loop

1. Find jobs that are due.
2. Simulate each one, to avoid paying gas for a job someone else already took.
3. Execute the ones that simulate cleanly.
4. Remember the ones that fail permanently, and stop retrying them.

## A working keeper

```javascript
import {
  createPublicClient, createWalletClient, defineChain, http, parseAbiItem,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const REGISTRY = "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1";
const RPC = "https://rpc.mainnet.chain.robinhood.com";

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

const abi = [
  parseAbiItem("function nextJobId() view returns (uint256)"),
  parseAbiItem("function isExecutable(uint256) view returns (bool)"),
  parseAbiItem("function execute(uint256 jobId)"),
  parseAbiItem(
    "function getJob(uint256) view returns ((address,uint8,bool,bool,address,address,uint256,uint256,bytes32,bytes32,uint256))"
  ),
];

const account = privateKeyToAccount(process.env.KEEPER_KEY);
const pub = createPublicClient({ chain, transport: http(RPC, { batch: true }) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

// Jobs that reverted for a reason that will not change. Do not retry these.
const hopeless = new Set();

async function findDue() {
  const next = await pub.readContract({ address: REGISTRY, abi, functionName: "nextJobId" });
  if (next === 0n) return [];

  const ids = [];
  for (let i = 0n; i < next; i++) if (!hopeless.has(i)) ids.push(i);
  if (ids.length === 0) return [];

  const flags = await pub.multicall({
    contracts: ids.map((id) => ({
      address: REGISTRY, abi, functionName: "isExecutable", args: [id],
    })),
    allowFailure: true,
  });

  return ids.filter((_, i) => flags[i].status === "success" && flags[i].result === true);
}

async function tryExecute(jobId) {
  try {
    // Simulating first means a job someone else already took costs nothing.
    const { request } = await pub.simulateContract({
      account, address: REGISTRY, abi, functionName: "execute", args: [jobId],
    });

    // Only take it if the bounty actually covers the gas.
    const job = await pub.readContract({
      address: REGISTRY, abi, functionName: "getJob", args: [jobId],
    });
    const bounty = job[10];
    const gasPrice = await pub.getGasPrice();
    const cost = gasPrice * 120_000n;

    if (bounty <= cost) {
      console.log(`job ${jobId}: bounty ${bounty} does not cover ${cost}, skipping`);
      return;
    }

    const hash = await wallet.writeContract(request);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    const spent = receipt.gasUsed * receipt.effectiveGasPrice;
    console.log(`job ${jobId}: done, earned ${bounty - spent} wei net`);
  } catch (e) {
    const msg = String(e?.shortMessage ?? e?.message ?? e);

    if (/JobAlreadyExecuted|JobCancelled/.test(msg)) {
      hopeless.add(jobId);                     // terminal, forget it
    } else if (/JobNotYetEligible/.test(msg)) {
      /* a timing race, it will come round again */
    } else {
      // Most often a dead nonce: the owner signed another permit and this
      // signature can never verify. It will fail forever, so stop trying.
      hopeless.add(jobId);
      console.log(`job ${jobId}: unrunnable, ${msg.slice(0, 90)}`);
    }
  }
}

async function tick() {
  const due = await findDue();
  if (due.length > 0) console.log(`${due.length} job(s) due`);
  for (const id of due) await tryExecute(id);
}

setInterval(() => tick().catch(console.error), 30_000);
tick().catch(console.error);
```

Run it with a funded key:

```bash
KEEPER_KEY=0x... node keeper.js
```

> Use a key that holds only what a keeper needs. It never touches user tokens, only gas and
> bounties, so there is no reason for it to hold anything valuable.

## Scaling past the naive scan

The loop above walks every job id each tick. That is fine for hundreds and wasteful for
thousands. When it stops being fine, index the events instead:

```javascript
const logs = await pub.getLogs({
  address: REGISTRY,
  event: parseAbiItem(
    "event ScheduleCreated(uint256 indexed jobId, address indexed owner, address indexed token, address spender, uint256 expiresAt, uint256 permitDeadline, uint256 bounty)"
  ),
  fromBlock: lastSeenBlock,
  toBlock: "latest",
});
```

Every `ScheduleCreated` carries `expiresAt`, so you can keep a queue ordered by due time and only
wake for the head of it. Watch `ApprovalExpired` and `ScheduleCancelled` to prune.

## Knowing when to give up on a job

This is the part naive keepers get wrong. Some jobs revert forever:

| Cause | Recoverable |
|---|---|
| Owner's nonce moved, signature dead | Never, until the owner cancels and reschedules |
| Token has no canonical permit | Never |
| Token's fallback swallows the call, `AllowanceNotCleared` | Never |
| Already executed or cancelled | Never |
| Not eligible yet | Yes, wait |
| Someone else won the race | Yes, move on |

Retrying a dead job every thirty seconds burns RPC quota for nothing. Keep the `hopeless` set.

## Making sure your keeper can be paid

`execute` pushes ETH to `msg.sender` and reverts if the transfer fails. An EOA is always fine. A
contract keeper needs a `receive` or a payable fallback, or every bounty bearing job will revert
on it.

## Being a good keeper

- **Do not front run other keepers for the sake of it.** There is enough for everybody and gas
  wars only shrink the pool.
- **Run jobs with small bounties when gas is cheap.** They are somebody's protection, and a job
  nobody runs is a user who thinks they are safe and is not.
- **Publish that you are running one.** Users choosing a bounty want to know somebody is watching.
