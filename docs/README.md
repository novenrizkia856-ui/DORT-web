# What DORT is

DORT is a security protocol on Robinhood Chain. It does one thing: it lets an ERC 20 token
approval carry an expiry date that you choose, and it removes that approval automatically once
the date arrives.

Nothing else. No dashboard to remember. No custody of your tokens. No admin who can change the
rules afterwards.

## The problem

Every time you use a decentralised exchange, a lending market, or a bridge, it asks you to
approve a token first. That approval is a standing permission for a smart contract to move your
tokens on your behalf.

Three things about that permission make it dangerous over time:

- **It is usually unlimited.** Most apps request the maximum possible allowance, because it saves
  the user a transaction later.
- **It never expires.** The ERC 20 standard has no concept of a deadline. An approval granted in
  2021 is exactly as live today.
- **You forget it exists.** The app that asked for it may be abandoned, sold, or compromised
  years after you last opened it.

The result is a slow accumulation of standing permissions across every wallet that has ever
touched a contract. Attackers know this. Approval abuse is one of the most reliable ways to drain
a wallet, and it needs no private key: the permission was granted willingly, and it was never
taken back.

## The answer

DORT does not change how approvals work. It cannot, because ERC 20 is fixed.

What it does instead is use a second standard that most modern tokens already implement,
**EIP 2612**, which lets a token owner change an allowance by signing a message rather than
sending a transaction.

The insight is small and the consequence is large. If you sign a message that sets an allowance
to zero, that signature is a revocation waiting to happen. It can be stored, held, and submitted
by anyone at any point in the future. DORT stores it, waits for the time you chose, and pays a
small reward to whoever submits it.

## What that gives you

| | |
|---|---|
| **You choose the deadline** | A day, a month, a year. It is your decision, not the app's. |
| **The approval works normally until then** | DORT does not interfere with the allowance while it is live. |
| **You do not have to come back** | Anyone can trigger the expiry once it is due. |
| **Your tokens are never held** | The registry never calls `transfer` or `transferFrom`. |
| **It cannot grant permissions** | The contract hardcodes an allowance of zero. It can only revoke. |

That last row is worth reading twice. `execute` passes a literal `0` as the permit value, so a
signature that would grant an allowance simply will not verify. The worst thing a malformed or
malicious job can do is remove an allowance that its owner already wanted removed.

## What you are trusting

Once deployed, the bytecode is the entire trust model. There is:

- no owner and no admin role
- no pause switch
- no upgrade path or proxy
- no oracle or external data source
- no backend that has to stay online

Read [Security model](protocol/security.md) for the full picture, including what an internal
audit found and what it deliberately left alone.

> **This has not had an independent audit.** It went through an internal review with full test
> coverage, randomised invariant testing and a live security drill against the deployed bytecode.
> That is not the same thing as a third party human audit. Judge it accordingly, and start small.

## Where to go next

- **[How it works](how-it-works.md)** walks the five steps end to end.
- **[Quickstart](quickstart.md)** protects your first approval in a few minutes.
- **[Architecture](protocol/architecture.md)** is the shape of the system for engineers.
- **[DORTRegistry](contracts/registry.md)** is the complete function reference.
