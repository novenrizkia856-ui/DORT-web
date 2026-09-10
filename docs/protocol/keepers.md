# Keepers and bounties

"Automatically" has to mean something. On a blockchain nothing runs by itself, so somebody has to
send the transaction. The bounty is how that somebody gets paid.

## The arrangement

When you schedule a job you attach ETH. When the job becomes due, anyone can call `execute`, and
the contract forwards that ETH to whoever made the call.

```solidity
if (bounty != 0) {
    (bool ok,) = msg.sender.call{value: bounty}("");
    if (!ok) revert BountyTransferFailed();
}
```

There is no allow list, no registration, and no privileged role. A keeper is simply an address
that noticed a job was due and paid the gas to run it.

## What it costs to run a job

Measured against the deployed registry on a fork of mainnet, with a canonical permit token:

| | |
|---|---|
| Gas used by `execute` | **98,274** |
| Gas price at time of writing | about 0.16 gwei |
| Cost to the keeper | about **0.000016 ETH** |

A tolerant estimate of 120,000 gas is what the reference interface uses to size its suggestion,
which leaves roughly twenty percent of headroom for tokens whose `permit` does more work than the
reference one.

## Sizing a bounty

The floor is the gas cost. Below that, no rational keeper runs the job.

```text
breakEven = gasPrice x 120,000
suggested = breakEven x 3
```

Three times break even is a reasonable default. It survives a gas price spike between scheduling
and execution, and it leaves enough margin that a keeper competing for the job still profits.

> **A bounty below break even is worse than no job at all.** The job sits there, nobody runs it,
> and you believe you are protected when you are not. The reference interface warns about this and
> it is not being fussy. This is finding M-06 in the [audit summary](../reference/audit.md).

You are not giving the money away. Cancel before the job runs and the whole bounty comes back.

## The bootstrapping problem

Bounties attract keepers only once keepers exist. Right now the network is new and there is no
established keeper running against it.

That is a real gap and it is worth being plain about: **if you schedule a job today and nobody
runs a keeper, the job will not execute on its own.** You can execute it yourself, and the
reference interface has a tab that lists everything currently due so that anyone can, but a
protocol whose headline promise is "you do not have to come back" needs somebody watching.

If you are running infrastructure on Robinhood Chain, this is an easy and profitable thing to
point a bot at. [Run a keeper](../guides/keeper.md) is about a hundred lines.

## Finding work

`nextJobId` bounds the search, and `isExecutable` answers the question directly:

```typescript
const next = await registry.read.nextJobId();
for (let id = 0n; id < next; id++) {
  if (await registry.read.isExecutable([id])) {
    // this one is due
  }
}
```

For anything beyond a handful of jobs, batch those reads through Multicall3, which is deployed at
the canonical address `0xcA11bde05977b3631167028862bE2a173976CA11` on this chain. Or watch
`ScheduleCreated` logs and keep your own index of upcoming expiries, which scales better.

## Competition, and losing the race

Two keepers may target the same job. Only one wins; the other's transaction reverts with
`JobAlreadyExecuted` and they pay gas for nothing.

That is normal for permissionless work, and there are two ways to handle it:

- **Simulate first.** `simulateContract` before sending catches a job that was taken while you
  were preparing.
- **Accept the occasional loss.** At sixteen microether a failed race is cheap. Chasing every job
  is usually better than being careful about each one.

The contract does nothing to arbitrate between keepers, on purpose. Any mechanism that picked
winners would be a privilege, and there are no privileges here.

## When execute reverts

It reverts as a whole and the job stays untouched, which is the safe outcome. Common causes:

| Revert | Meaning |
|---|---|
| `JobNotYetEligible` | Not due yet. Check `isExecutable` first. |
| `JobAlreadyExecuted` | Somebody beat you to it. |
| `JobCancelled` | The owner called it off. |
| `AllowanceNotCleared` | The token's `permit` returned without clearing the allowance. Nothing was paid. |
| `BountyTransferFailed` | Your address rejected the ETH. Use one that can receive it. |
| A revert from the token | Usually the owner's nonce moved, so the stored signature is dead. That job is unrunnable until its owner reschedules. |

The last one is worth filtering for. A job whose signature is dead will fail forever, so drop it
from your queue rather than retrying it every block.

## A note on the bounty recipient

`execute` pushes ETH to `msg.sender` and reverts if that transfer fails. A keeper contract with
no `receive` and no payable fallback therefore cannot collect, and its call will revert.

If your keeper is a contract, make sure it can accept ETH. If it cannot, it can still execute
jobs whose bounty is zero.
