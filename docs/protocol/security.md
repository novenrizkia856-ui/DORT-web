# Security model

What you are trusting, what was tested, and what was deliberately left alone.

## The short version

Once deployed, the bytecode is the entire trust model. There is no owner, no admin, no pause, no
upgrade path, no oracle and no backend. Nobody, including the people who wrote it, can change how
it behaves or reach the ETH it holds.

## The bounded blast radius

Before any of the mechanics, one structural property does most of the work:

```solidity
IERC20Permit(token).permit(jobOwner, spender, 0, job.permitDeadline, job.v, job.r, job.s);
```

The value is a hardcoded `0`. The token hashes the value as part of the signed message, so a
signature that would grant an allowance cannot verify through this path. **The registry can only
ever drive an allowance to zero.** The worst outcome of a malicious or malformed job is that an
allowance its owner already wanted gone, goes.

That leaves exactly one asset at risk: the ETH bounty, which is only ever paid to the executor or
refunded to the owner.

## Checks, effects, interactions

Both state changing functions write every effect before touching anything external, and carry a
reentrancy guard on top of that.

```solidity
function execute(uint256 jobId) external nonReentrant {
    // checks ...

    // effects, complete before any external call
    job.executed = true;
    uint256 bounty = job.bounty;
    job.bounty = 0;

    // interactions
    IERC20Permit(token).permit(...);
    if (IERC20Permit(token).allowance(jobOwner, spender) != 0) revert AllowanceNotCleared();
    if (bounty != 0) { /* forward, revert on failure */ }
}
```

Three independent mechanisms stop the same bounty being paid twice: the `executed` flag, the
zeroed `bounty`, and the guard. Any one of them would be enough.

## The two hostile surfaces

DORT hands control to a user supplied address twice per execution. Both were treated as hostile
and tested as such.

### The token's permit

A job names its own token, so a malicious token can reenter the registry mid execution. Tested in
four shapes:

| Attack | Result |
|---|---|
| Reenter `execute` on a **different** job | Blocked by the guard. This is the case where the guard is the only thing standing in the way. |
| Reenter `execute` on the **same** job | Blocked twice over: the guard, and the `executed` flag set before the call. |
| Reenter `cancel` on a job the token owns | Blocked by the guard. |
| Let the reentrancy revert bubble | The whole transaction dies, no state survives, no funds move. |

### The bounty recipient

An executor contract can reenter from its `receive` hook the instant the ETH lands. Blocked by
the guard, and tested with a contract that does exactly that.

## The silent success problem

Solidity inserts an `extcodesize` check before a high level call to a function returning nothing,
so calling `permit` on an address with no code reverts. But a **contract** with a permissive
`fallback() external payable {}` accepts any unknown selector and returns success.

Without a defence, that token would let `permit` appear to succeed while the allowance stayed
exactly where it was, and the registry would pay a bounty for nothing.

The defence is a post condition:

```solidity
if (IERC20Permit(token).allowance(jobOwner, spender) != 0) revert AllowanceNotCleared();
```

One extra static call per execution. It buys the guarantee that **a paid bounty implies the work
was done**, which is otherwise not true.

## What testing was done

| | |
|---|---|
| Tests | 67, all passing |
| Coverage on both source files | 100% of lines, statements, branches and functions |
| Invariants | 6 properties, 1,024 runs at depth 64, **393,216 calls**, zero violations |
| Live drill | 8 phases, 30 checks, against a real node with real signatures and timestamps |
| Static analysis | Slither 0.11.6, every finding triaged |
| Bytecode scan | Zero Cancun opcodes in either deployed artefact |

The primary invariant is the accounting one:

> The registry's ETH balance always equals the sum of bounties on jobs that are neither executed
> nor cancelled, exactly, with no drift in either direction.

Alongside it: every wei held has exactly one identified claimant, a settled job carries no bounty,
a job never reaches both terminal states, and every existing job has a real owner.

The registry has no `receive` and no payable fallback, so its balance can only ever come from
`scheduleExpiry`. That is what makes the accounting provable rather than merely observed.

## What Slither found

Eight findings: one High, four Low, three Informational. The High is
`arbitrary-send-eth`, flagged because `execute` sends ETH to `msg.sender` with no access check.

That is the specification, not a bug. A permissionless bounty is the entire point, and there is no
owner to check against. The property that actually has to hold is narrower and it does hold:
**an executor can never extract more than the bounties of the jobs it genuinely executed**. It is
enforced three ways and proven by a dedicated regression test plus the invariant runs.

Full triage, including the four Low and three Informational, is in the
[audit summary](../reference/audit.md).

## What is not covered

Be clear eyed about this.

- **There has been no independent audit.** The review was internal and AI assisted. It was
  thorough, and it is not the same thing as a third party human looking for what the author missed.
- **The contracts are not yet verified on the block explorer.** Until the source is published
  against the address, "the bytecode is the whole trust model" is a claim you have to take on
  faith rather than check.
- **Token behaviour is out of scope.** DORT asserts the allowance reached zero, but a token that
  lies in its own `allowance` view could still deceive it. A token that malicious has easier ways
  to harm its holders.
- **The bootstrapping gap is real.** No established keeper is running yet, so scheduled jobs may
  need running by hand. See [Keepers and bounties](keepers.md).

## If you find something

The contracts are immutable, so a finding cannot be patched in place. What can happen is a new
deployment and a clear public notice steering people away from the old one. That is a real cost,
which is a reason to look hard before depositing anything you would miss.
