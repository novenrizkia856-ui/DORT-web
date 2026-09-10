# Job lifecycle

A job has three terminal states and it can only ever reach one of them.

## The states

```text
                    scheduleExpiry()
                          │
                          ▼
                   ┌─────────────┐
                   │   WAITING   │   block.timestamp < expiresAt
                   └──────┬──────┘   the allowance is live and untouched
                          │
             time passes  │
                          ▼
                   ┌─────────────┐
                   │  ELIGIBLE   │   block.timestamp >= expiresAt
                   └──┬───────┬──┘   anyone may now execute
                      │       │
          execute()   │       │   cancel()          ← owner only,
                      ▼       ▼                       and available
              ┌────────────┐ ┌────────────┐           from WAITING too
              │  EXECUTED  │ │ CANCELLED  │
              └────────────┘ └────────────┘
                 terminal        terminal
```

`cancel` is available from both **WAITING** and **ELIGIBLE**. The owner is never locked out of
their own bounty, including after the job became eligible and nobody ran it.

## What each transition does

### scheduleExpiry

Validates, assigns the next id, writes the job, emits `ScheduleCreated`. The ETH sent with the
call becomes the bounty.

Two checks, and both reject rather than store something broken:

```solidity
if (expiresAt <= block.timestamp) revert ExpiryNotInFuture();
if (permitDeadline < expiresAt)   revert PermitDeadlineBeforeExpiry();
```

The second one matters more than it looks. A job whose permit expires before it becomes eligible
could never succeed, so it is refused at creation rather than left on chain looking valid.

### execute

Checks, then writes every effect, then makes external calls, in that order.

```solidity
// checks
if (jobOwner == address(0))          revert JobDoesNotExist();
if (job.executed)                    revert JobAlreadyExecuted();
if (job.cancelled)                   revert JobCancelled();
if (block.timestamp < job.expiresAt) revert JobNotYetEligible();

// effects, before anything external is touched
job.executed = true;
uint256 bounty = job.bounty;
job.bounty = 0;

// interactions
IERC20Permit(token).permit(jobOwner, spender, 0, job.permitDeadline, job.v, job.r, job.s);
if (IERC20Permit(token).allowance(jobOwner, spender) != 0) revert AllowanceNotCleared();
if (bounty != 0) { /* forward to msg.sender, revert if it fails */ }
```

That `AllowanceNotCleared` line is a post condition, not a formality. A token with a permissive
fallback would let the `permit` call return successfully while doing nothing at all, and without
this check the registry would pay a bounty for work that never happened. See
[Security model](security.md).

### cancel

Owner only. Marks the job cancelled, zeroes the bounty, refunds it.

```solidity
if (jobOwner == address(0))   revert JobDoesNotExist();
if (msg.sender != jobOwner)   revert NotJobOwner();
if (job.executed)             revert JobAlreadyExecuted();
if (job.cancelled)            revert JobCancelled();
```

The last check is not redundant. Without it a second cancel would refund the bounty again and
drain the contract.

## Reading the state

`getJob` returns the whole struct. `isExecutable` answers the one question a keeper actually has:

```solidity
function isExecutable(uint256 jobId) external view returns (bool) {
    Job storage job = _jobs[jobId];
    return job.owner != address(0) && !job.executed && !job.cancelled
        && block.timestamp >= job.expiresAt;
}
```

An id that was never created returns a zeroed struct rather than reverting, so
`owner == address(0)` is the reliable test for "does not exist". `jobId < nextJobId` works too.

## A fourth state that is not on chain

A job can be **stale**: still waiting, still cancellable, but certain to fail if executed.

This happens when the token's nonce moves past the one your signature was built against. EIP 2612
nonces increment on every successful permit, so signing any other permit on the same token kills
every stored signature you had for it.

The contract cannot detect this, because it does not know what the nonce was at scheduling time.
An interface can, by comparing the token's current nonce against the one it recorded:

```typescript
const currentNonce = await token.read.nonces([owner]);
const isStale = currentNonce > nonceWhenScheduled;
```

A stale job is not dangerous. It simply will not run, and the fix is always the same: cancel,
take the bounty back, schedule again. [The permit signature](permit.md) explains why nonces work
this way.

## Events

| Event | Emitted by | Carries |
|---|---|---|
| `ScheduleCreated` | `scheduleExpiry` | jobId, owner, token, spender, expiresAt, permitDeadline, bounty |
| `ApprovalExpired` | `execute` | jobId, executor, token, owner, spender, bounty |
| `ScheduleCancelled` | `cancel` | jobId, owner, bounty |

`jobId`, `owner` and `token` are indexed on `ScheduleCreated`, so every job an address ever
created comes back from a single log query rather than by walking `nextJobId`.

Because the bounty is zeroed in storage when a job settles, the events are the authoritative
record of what a settled job was worth. `getJob` on an executed job reports a bounty of zero,
which is correct: it owes nothing any more.
