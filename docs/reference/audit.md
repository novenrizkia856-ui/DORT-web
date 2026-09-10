# Audit summary

A condensed version of the internal review. The full report lives in the contracts repository at
`audit/INTERNAL_AUDIT_REPORT.md`.

> **This was an internal, AI assisted review, not an independent third party audit.** Given that
> the registry holds user bounty deposits and controls live approval permissions, an independent
> human review before relying on it heavily is strongly recommended, even with every item below
> satisfied.

## Scope

| File | Runtime | In scope |
|---|---|---|
| `src/DORTRegistry.sol` | 3,025 bytes | yes |
| `src/DORTLens.sol` | 1,783 bytes | yes |
| `src/interfaces/IERC20Permit.sol` | n/a | interface only |

Out of scope: tests, scripts, the OpenZeppelin library, and the website.

## Testing

| | |
|---|---|
| Tests | 67, all passing |
| Coverage, both files | **100%** of lines, statements, branches and functions |
| Invariants | 6 properties, 1,024 runs at depth 64, **393,216 calls**, zero violations |
| Live drill | 8 phases, 30 checks, on a real node |
| Static analysis | Slither 0.11.6 |
| Second static pass | Aderyn, **skipped**, not available in the build environment |

The invariants:

1. The registry's ETH balance equals the sum of bounties on jobs that are neither executed nor
   cancelled, exactly, with no drift in either direction.
2. Every wei held is claimable by exactly one identified party.
3. A settled job carries no bounty.
4. A job never reaches both terminal states.
5. Every existing job has a real owner.

## Static analysis findings

Eight from Slither: one High, four Low, three Informational.

### S-01 · High · `arbitrary-send-eth` · accepted, false positive

`execute` sends ETH to `msg.sender` with no access check.

That is the specification. A permissionless bounty is the entire point, and there is no owner to
check against. The narrower property that does have to hold is that **an executor can never
extract more than the bounties of the jobs it genuinely executed**, and three independent
mechanisms enforce it:

1. `executed` is set before any external call
2. `bounty` is zeroed before any external call
3. `nonReentrant` covers the whole function

Mechanism 2 was added during this review; the first draft kept the bounty in storage as a
historical record. It now lives in the event instead, which makes the accounting invariant
provable from storage alone.

### S-02 · Low · `calls-loop` · accepted

The lens static calls each token in a loop, because it is a batch reader. Documented as intended
for off chain `eth_call`. It holds no funds and can change no state.

### S-03 · Low · `timestamp` · accepted

The protocol is a timer. On an Orbit chain the sequencer's timestamp is bounded against L1, and a
few seconds either way is immaterial to a thirty day horizon. There is no advantage in executing
marginally early, because the payout is fixed at scheduling time.

### S-04 · Informational · `low-level-calls` · accepted

Three, all deliberate. Two are the checked bounty transfers that must revert on failure rather
than swallow it. The third is the lens's guarded `staticcall`.

## Manual review findings

### M-01 · Medium, designed out · a permissive fallback could fake a permit

Solidity's `extcodesize` check catches a codeless address, but a **contract** with
`fallback() external payable {}` accepts any unknown selector and returns success. The first draft
would have paid a bounty while the allowance stayed exactly where it was.

Fixed by asserting the post condition:

```solidity
if (IERC20Permit(token).allowance(jobOwner, spender) != 0) revert AllowanceNotCleared();
```

One extra static call. It buys the guarantee that a paid bounty implies the work was done.

### M-02 · Low · the deadline trap

The contract requires only `permitDeadline >= expiresAt`. Setting them equal is legal and leaves a
one second execution window, because EIP 2612 rejects a permit once `block.timestamp > deadline`.

Found because the first invariant run reported zero successful executions out of roughly 8,000
calls. Chasing that down surfaced this rather than a fuzzer quirk.

No funds at risk, but the job never runs. Cannot be fixed on chain without baking in an arbitrary
constant, so it is the interface's job. The reference interface sets a decade.

### M-03 · Low · front running the stored permit

A signature in public storage can be replayed at the token directly. That consumes the nonce and
kills the stored signature. The allowance still ends up at zero, no bounty is paid for work not
done, and the owner cancels to recover it. Accepted.

### M-04 · Low · an owner that cannot receive ETH cannot be refunded

`cancel` pushes the refund with a checked call, as specified. A contract owner with no `receive`
cannot cancel. The bounty is not lost to anyone else, but cannot move until that address can accept
ETH. Accepted.

### M-05 · Low · an executor that cannot receive ETH cannot execute

The mirror, and less consequential. Someone else takes the job. Zero bounty jobs are unaffected.

### M-06 · Low · dust bounties

A bounty below the cost of running means no keeper picks it up, and the owner believes they are
protected when they are not. A UX problem the interface must warn about, not a contract bug.

### M-07 · Informational · DAI style permit is out of scope

Documented limitation. Such a job fails cleanly at `execute` and the owner cancels.

### M-08 · Informational · the lens heuristic has a known false positive

`probePermit` cannot see argument order, so a DAI style token reports true. Stated in the
contract's own NatSpec.

### D-01 · Informational · two additions beyond the literal specification

Flagged for an explicit decision rather than assumed welcome:

1. The `AllowanceNotCleared` post condition, without which the "never silently succeed"
   requirement is not met.
2. `isExecutable`, a pure view so keepers do not reassemble the eligibility rules off chain and
   risk disagreeing with the contract.

Both recommended for keeping.

## Status

**No Medium or higher severity finding is open.** M-01 was designed out before it could exist.
S-01 is a detector false positive, classified as such after analysis rather than waved away.

## Bytecode

Both deployed artefacts were scanned opcode by opcode, skipping `PUSH` immediate data, for Cancun
only instructions:

```text
DORTRegistry    2,972 bytes of code | cancun opcodes: NONE
DORTLens        1,730 bytes of code | cancun opcodes: NONE
```

This matters because Robinhood Chain is an Arbitrum Orbit chain whose ArbOS version has not been
verified, and Cancun opcodes only arrived on Orbit with ArbOS 32.

## What is still open

- **No independent audit.** The single largest gap.
- **Source not yet verified on the explorer**, so the bytecode claim is not yet checkable by a
  third party. See [Deployments](../contracts/deployments.md).
- **No keeper running.** See [Keepers and bounties](../protocol/keepers.md).
