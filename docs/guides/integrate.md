# Integrate DORT

If your app asks users for token approvals, you can offer them an expiry in the same breath.

## Why an app would want this

An approval request is a moment of friction. Users hesitate, and the ones who understand what
they are granting hesitate most. Being able to say *this permission ends in thirty days unless you
renew it* removes the reason to hesitate.

It also costs you nothing. DORT is a public contract with no fees, no registration, and no
relationship to maintain. You do not integrate with a company, you call a contract.

## The pattern

Right after your existing approval succeeds, offer the expiry:

```text
1. user approves your contract      <- you already do this
2. you offer: "end this in 30 days?"
3. user signs a permit, free
4. user confirms one transaction with a small bounty
```

Steps 3 and 4 are optional for the user. If they decline, nothing changes and your app works
exactly as before.

## Minimum viable integration

```typescript
import { parseAbiItem, parseSignature, parseEther } from "viem";

const REGISTRY = "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1";

async function offerExpiry(token, spender, owner, days) {
  // 1. Resolve the domain. Never guess it.
  const domain = await resolveDomain(token);       // see the schedule guide
  if (!domain) return null;                        // token not supported, say nothing

  const nonce = await readNonce(token, owner);
  const block = await pub.getBlock();
  const expiresAt = block.timestamp + BigInt(days) * 86400n;
  const permitDeadline = expiresAt + 10n * 365n * 24n * 60n * 60n;

  // 2. One free signature.
  const sig = await wallet.signTypedData({
    account: owner,
    domain,
    types: {
      Permit: [
        { name: "owner", type: "address" }, { name: "spender", type: "address" },
        { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner, spender, value: 0n, nonce, deadline: permitDeadline },
  });
  const { r, s, v, yParity } = parseSignature(sig);

  // 3. One transaction carrying the bounty.
  const gasPrice = await pub.getGasPrice();
  const { request } = await pub.simulateContract({
    account: owner,
    address: REGISTRY,
    abi: [parseAbiItem(
      "function scheduleExpiry(address token, address spender, uint256 expiresAt, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable returns (uint256)"
    )],
    functionName: "scheduleExpiry",
    args: [token, spender, expiresAt, permitDeadline, Number(v ?? (yParity === 1 ? 28n : 27n)), r, s],
    value: gasPrice * 120_000n * 3n,
  });

  return wallet.writeContract(request);
}
```

## Four things to get right

### 1. Resolve the domain, do not guess it

A signature built on the wrong `name` or `version` will never verify. The job sits there with the
user's bounty until they cancel, and they will blame your app. Full method in
[Schedule an expiry](schedule.md).

### 2. Set the deadline far past the expiry

Equal values leave a one second execution window. Use a decade. Detail in
[The permit signature](../protocol/permit.md).

### 3. Do not let the bounty fall below the cost of running

A job nobody runs is worse than no job, because the user believes they are protected. Size it from
the live gas price, at least break even and preferably three times it.

### 4. Detect stale signatures

Every permit a user signs on a token invalidates every stored signature for that token. If your
app also uses permits, your own flow will kill the expiries you scheduled.

Record the nonce at scheduling and compare it later:

```typescript
const [, currentNonce] = await pub.readContract({
  address: "0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395",
  abi: [parseAbiItem("function probePermit(address,address) view returns (bool,uint256)")],
  functionName: "probePermit",
  args: [token, owner],
});
const dead = currentNonce > nonceWhenScheduled;
```

## Checking a token before you offer

`DORTLens.scanAllowances` answers for many pairs in one call, which is what you want if you are
showing a user their existing approvals:

```typescript
const rows = await pub.readContract({
  address: LENS,
  abi: [parseAbiItem(
    "function scanAllowances(address owner, address[] tokens, address[] spenders) view returns ((address,address,uint256,uint256,bool,bool)[])"
  )],
  functionName: "scanAllowances",
  args: [owner, tokens, spenders],
});
```

Remember `permitLikely` is a heuristic and can be a false positive on DAI style tokens. The domain
resolution in step 1 is the real check.

## What you do not have to build

- **No keeper.** Anyone can execute, and the bounty pays them. You are not on the hook for running
  infrastructure.
- **No backend.** Everything is readable from a public RPC endpoint.
- **No integration agreement.** There is nobody to ask. The contract has no owner.

## What you should tell your users

Be plain about the trade. They are attaching a small amount of ETH that pays whoever performs the
revocation, and they get it back if they cancel first. And be plain that DORT has not had an
independent audit yet, which is covered in [Security model](../protocol/security.md).

## Displaying job state

Four states are worth showing, and they are derived rather than stored:

| State | How to derive |
|---|---|
| Waiting | not executed, not cancelled, `now < expiresAt` |
| Ready | not executed, not cancelled, `now >= expiresAt` |
| Done | `executed` is true |
| Cancelled | `cancelled` is true |

Plus the fifth that only an interface can see: **stale**, when the token's nonce has moved past
the one the job was signed against. Show it clearly and offer the cancel button, because that job
will never run.
