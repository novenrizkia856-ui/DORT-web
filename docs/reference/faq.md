# FAQ

## The basics

### What is a token approval?

Permission for a smart contract to move a token on your behalf. Almost every app asks for one
before a swap or a deposit. It usually has no limit and no end date.

### Why does an expiry date matter?

An approval you forgot about is still live. If the app that holds it is ever compromised, that old
permission is the way in. An expiry closes the window on a schedule you set yourself.

### Does DORT hold my tokens?

No. It never calls `transfer` or `transferFrom` and holds no token balances. The only asset it
custodies is the ETH bounty attached to a job.

### Can DORT increase an allowance?

No, and not by policy but by construction. `execute` passes a hardcoded `0` as the permit value.
The token hashes the value as part of the signed message, so a signature that would grant an
allowance cannot verify through DORT.

### Which chain?

Robinhood Chain, an Arbitrum Orbit L2 settling to Ethereum. Chain ID 4663. Gas is paid in ETH.

## Using it

### What does it cost?

One transaction to schedule, plus whatever bounty you attach. The bounty comes back if you cancel
before the job runs. Execution costs a keeper about 0.000016 ETH at current gas, so a bounty of a
few times that is sensible.

### Does my approval stop working while it is scheduled?

No. Nothing changes until the moment you chose. DORT does not touch the allowance in the meantime.

### Can I cancel?

Any time before it runs, and only you can. The bounty comes straight back. Cancelling does not
touch the approval itself, only the scheduled expiry.

### What if I need the approval after it expires?

Approve again. It is the same single transaction you did the first time. Nothing is locked away.

### Which tokens work?

Any ERC 20 implementing the canonical EIP 2612 permit. Tokens with a different permit shape, such
as DAI's older one, are out of scope. The app checks before letting you schedule.

### Can I schedule several expiries on the same token?

You can, but only the first to execute will succeed. Every successful permit increments the
token's nonce, which invalidates the other stored signatures. See
[The permit signature](../protocol/permit.md).

## When things go wrong

### My job says "signature dead". What happened?

You signed another permit on that token, which moved its nonce past the one your job was built
against. The job can never run now. Cancel it, take the bounty back, and schedule again.

### Somebody executed my permit before the expiry. Is that bad?

No. The allowance still ended up at zero, which is what you wanted, just sooner. No bounty was
paid for it, and you can cancel to recover yours. The person who did it paid gas to do you a
favour.

### Nobody has run my job and it is overdue.

Two possibilities. The bounty may be too small to be worth anyone's gas, or there may simply be no
keeper watching yet. You can execute it yourself, and the app lists everything currently due so
that anyone can. See [Keepers and bounties](../protocol/keepers.md).

### Can my ETH get stuck?

Only if the address that created the job cannot receive ETH, which for a normal wallet cannot
happen. A contract owner with no `receive` function cannot be refunded until that changes. The
bounty is not lost to anyone else in that case.

## Trust and security

### Who controls the contract?

Nobody. There is no owner, no admin role, no pause switch and no upgrade path. Once deployed, the
bytecode is the entire trust model. Not even the people who wrote it can change how it behaves.

### Has it been audited?

**Not by an independent firm.** It went through an internal review with 100% test coverage,
393,216 randomised invariant calls, a live security drill against the deployed bytecode, and
static analysis. That is thorough and it is not the same as a third party human audit. See the
[audit summary](audit.md).

### Can I check the source matches what is deployed?

Not yet through the block explorer, because its API sits behind a challenge that blocks automated
verification. You can compare the deployed bytecode against a local build of the tagged commit
yourself, which is what was done immediately after deployment. See
[Deployments](../contracts/deployments.md).

### What is the worst thing a bug could do?

The blast radius is bounded by construction. The registry can only drive an allowance to zero and
holds no tokens, so the only asset at risk is the ETH bounty on a job, which is only ever paid to
an executor or refunded to the owner.

### Is there a token?

No. None has launched and the protocol does not need one. Any address claiming to be a DORT token
right now is not ours.

## Building on it

### Do I need permission to integrate?

No. There is nobody to ask. It is a public contract with no fees and no registration. See
[Integrate DORT](../guides/integrate.md).

### Can I run a keeper?

Yes, and please do. Anyone can execute an eligible job and collect its bounty. There is no allow
list. [Run a keeper](../guides/keeper.md) is about a hundred lines.

### Is there an API or a subgraph?

No, and none is needed. Every job is readable from a public RPC endpoint, and `ScheduleCreated`
indexes `owner` and `token` so log queries do the work an indexer usually would.
