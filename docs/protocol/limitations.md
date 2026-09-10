# Limitations

Everything DORT does not do. None of these are bugs and all of them are deliberate.

## Only canonical EIP 2612 tokens

DORT calls exactly one signature:

```solidity
permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
```

A token that does not expose that selector cannot be scheduled usefully. Three cases:

| Token | What happens |
|---|---|
| Plain ERC 20, no permit at all | `execute` reverts cleanly. Nothing is lost, the owner cancels. |
| DAI style permit, a different argument order | Same. The canonical selector does not exist on it. |
| A contract with a permissive fallback | `execute` reverts with `AllowanceNotCleared`. No bounty is paid. |

DAI's older shape is `permit(holder, spender, nonce, expiry, allowed, v, r, s)`. Supporting it
would mean a second code path and a way to choose between them, which is more surface for a
contract that cannot be fixed later. It is out of scope for version one.

The reference interface refuses to schedule a job when it cannot resolve a valid EIP 712 domain,
so most of this is caught before you spend gas.

## The lens can produce a false positive

`DORTLens.probePermit` checks that a token exposes `nonces(address)` and `DOMAIN_SEPARATOR()`.
That is the strongest signal a static call can get, because `permit` changes state and cannot be
probed without a real signature.

It cannot see argument order. A DAI style token exposes both of those views and will report
`permitLikely = true` while still being unusable here.

Treat the lens as "worth offering to the user", never as a guarantee. The only real proof is a
successful `execute`, and the domain check in the reference interface catches most of the gap.

## Front running is possible, and harmless

Your signature sits in public storage. Anyone can read it and submit it straight to the token
before `execute` is ever called.

If they do:

- The allowance still goes to zero, which is the outcome you wanted.
- The token's nonce is consumed, so the stored signature is dead.
- The honest `execute` then reverts, so **no bounty is paid for work not done**.
- You cancel and recover the full bounty.

The griefer pays gas to do you a favour and gets nothing. This is a stuck bounty scenario, not a
loss, and it is finding M-03 in the [audit summary](../reference/audit.md).

## Signing another permit kills your stored one

EIP 2612 nonces increment on every successful permit. Sign any other permit on the same token and
every signature DORT is holding for that token becomes unusable.

This is not DORT's doing, it is how the standard prevents replay. It does mean:

- Only one scheduled job per token can ever succeed, whichever runs first.
- Using a token's own permit flow elsewhere invalidates your scheduled expiry.

An interface can spot it by comparing the token's current nonce against the one recorded at
scheduling. The fix is always cancel and reschedule.

## Dust bounties are ignored

Nothing stops you attaching one wei. A keeper would lose money running it, so nobody will, and
the job sits there forever.

The contract stays perfectly consistent and you can always reclaim your dust. But you would
believe you were protected when you were not, which is the actual harm. Finding M-06.

The reference interface warns when a bounty falls below the cost of execution.

## Push payments, and addresses that reject ETH

Both the bounty and the refund are pushed with a checked low level call that reverts the whole
transaction on failure. Consequences:

- A **keeper** contract that cannot receive ETH cannot execute a job carrying a bounty. Someone
  else will. Zero bounty jobs are fine.
- An **owner** contract that cannot receive ETH cannot cancel, because the refund fails. Its
  bounty is not lost to anyone else, but it cannot be moved until that address can accept ETH.

A pull payment escrow would remove the second case at the cost of extra state and a second
transaction for every honest user. For the overwhelmingly common case of an EOA owner this is
unreachable. Findings M-04 and M-05.

## The deadline trap

The contract requires only `permitDeadline >= expiresAt`. Setting them equal is legal and leaves
a one second window in which the job can run.

Fixing this on chain would mean baking an arbitrary minimum into an immutable contract. It is the
interface's job instead: set the deadline far past the expiry, a decade is fine. Finding M-02, and
[The permit signature](permit.md) has the detail.

## No keeper network yet

The bounty is designed to attract keepers, and keepers arrive once there is volume. Right now
there is neither.

Until somebody runs one, a scheduled job will not execute by itself. You can run it manually, and
the reference interface lists everything currently due so that anyone can. But the headline
promise is only fully true once a keeper is watching. See [Keepers and bounties](keepers.md).

## One chain

Deployed to Robinhood Chain mainnet only. The contracts have no chain specific code and would
deploy anywhere EVM equivalent, but each deployment is separate: a job on one chain knows nothing
about any other.

## Not yet verified on the explorer

The source has not been published against the deployed addresses yet, because the explorer's API
sits behind a challenge that blocks automated submission.

Until that is done, the claim that the deployed bytecode matches the reviewed source is one you
have to take on trust rather than check yourself. See [Deployments](../contracts/deployments.md).
