# The permit signature

The whole protocol rests on one signature. This page is what it contains, why it is safe to
store in public, and the one part an integrator must not get wrong.

## What EIP 2612 is

A standard that lets a token holder change an allowance by signing a message instead of sending a
transaction. The token exposes:

```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external;

function nonces(address owner) external view returns (uint256);
function DOMAIN_SEPARATOR() external view returns (bytes32);
```

Anyone may submit a valid permit. The token verifies the signature against `owner` and applies
the change. That is the property DORT is built on: **the person who signs and the person who
submits do not have to be the same**.

## What you sign

```text
Permit {
  owner    = your address
  spender  = the app you approved
  value    = 0
  nonce    = the token's current nonce for you
  deadline = far in the future
}
```

The `value` is always zero and it is hardcoded in the contract, not passed in:

```solidity
IERC20Permit(token).permit(jobOwner, spender, 0, job.permitDeadline, job.v, job.r, job.s);
```

This is the single most important line in the protocol. Because the value is baked into the call
and the token hashes the value as part of the message, **a signature that would grant an allowance
cannot verify through DORT**. The registry is structurally incapable of increasing a permission.
It can only drive one to zero.

## Why storing it in public is fine

The signature sits in contract storage where anyone can read it. That is not a leak, it is the
design.

- It authorises exactly one thing: setting your allowance to that one spender to zero.
- Doing it early is not an attack. The outcome is the one you asked for, just sooner.
- It cannot be replayed twice, because the token's nonce increments on first use.
- It cannot be repurposed, because the owner, spender, value, nonce and deadline are all part of
  what was signed.

The worst a hostile actor can do with it is revoke your approval for you, at their own gas
expense, and forfeit the bounty. See [Limitations](limitations.md) for why that is still worth
documenting.

## The domain, and the mistake to avoid

EIP 2612 signatures are EIP 712 typed data, which means they are bound to a **domain**:

```text
EIP712Domain {
  name              = the token's EIP 712 name
  version           = usually "1", sometimes "2"
  chainId           = 4663
  verifyingContract = the token address
}
```

Get `name` or `version` wrong and you produce a signature the token will never accept. The job
will sit there until its owner cancels, with the bounty stuck in the meantime. No funds are lost,
but nothing works either.

**Do not guess the domain.** Build a candidate and check it against the token's own separator:

```typescript
const DOMAIN_TYPEHASH =
  "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f";

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

// Try the plausible candidates, accept only an exact match.
for (const name of [await token.read.name(), ""]) {
  for (const version of [maybeVersion, "1", "2"]) {
    const candidate = { name, version, chainId: 4663, verifyingContract: token };
    if (computeDomainSeparator(candidate) === (await token.read.DOMAIN_SEPARATOR())) {
      return candidate;
    }
  }
}
return null; // refuse to schedule
```

The reference interface does exactly this and will not let a user schedule a job when no
candidate matches. If you are building your own, do the same.

## Deadlines, and a trap worth knowing about

The registry only requires:

```solidity
permitDeadline >= expiresAt
```

Setting the two **equal** is legal and it is what a naive interface would do, because both fields
read as "when this expires". It is also almost always wrong.

A permit is rejected once `block.timestamp > deadline`. If the deadline equals the expiry, the
job is executable only in the single second where they are equal, and is dead from the next
second onward.

**Set the deadline far past the expiry.** A decade is reasonable. The signature is useless for
anything except zeroing an allowance the user already wants gone, so a long deadline costs
nothing:

```typescript
const expiresAt = now + sevenDays;
const permitDeadline = expiresAt + 10n * 365n * 24n * 60n * 60n;
```

This is recorded as finding M-02 in the [audit summary](../reference/audit.md). It cannot be
fixed in an immutable contract without baking in an arbitrary constant, so it is the interface's
job.

## Nonces, and why signatures die

Every successful permit increments the token's nonce for that owner. That is what stops replay,
and it has a consequence worth planning for:

**Any permit you sign on a token invalidates every stored signature you had for that token.**

So if you schedule three expiries on the same token, only the first to execute will succeed. The
others become stale, and their owners should cancel and reschedule.

Record the nonce when you schedule and compare it later:

```typescript
const [permitLikely, currentNonce] = await lens.read.probePermit([token, owner]);
if (currentNonce > nonceWhenScheduled) {
  // this job can never run, tell the user to cancel
}
```

`DORTLens.probePermit` returns that nonce for exactly this reason. See
[DORTLens](../contracts/lens.md).

## Signature malleability

The registry does not check the `s` value or restrict `v`, because it does not need to: the token
verifies the signature, not DORT. A well implemented EIP 2612 token rejects the upper half of the
curve and any `v` outside `{27, 28}`.

If you are producing signatures, use a library that returns canonical low `s` values. viem's
`signTypedData` and `parseSignature` do.
