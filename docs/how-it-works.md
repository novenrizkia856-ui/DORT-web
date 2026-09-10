# How it works

Five steps. Only one of them is new to you, and it is free.

## The five steps

### 1. Approve a token, exactly as you always do

You use an app. It asks for an approval. You grant it. This happens entirely outside DORT and
DORT never sees it.

```text
you -> token.approve(theApp, 1000)
```

Nothing about this step changes. DORT is not in the path, and it does not need to be.

### 2. Sign one message choosing when it should end

Now you sign an **EIP 2612 permit** on that same token. The message says, in effect, *set my
allowance to this spender back to zero*.

```text
Permit {
  owner:    you
  spender:  theApp
  value:    0          <- always zero
  nonce:    <the token's current nonce for you>
  deadline: <far in the future>
}
```

This is a signature, not a transaction. It costs nothing, it touches no chain, and it does not
take effect until somebody submits it.

### 3. Confirm once to start the clock

You call `scheduleExpiry` on the registry, handing it the signature, the time you want the
approval to end, and a small amount of ETH as a **bounty**.

```text
you -> registry.scheduleExpiry(token, theApp, expiresAt, permitDeadline, v, r, s) + bounty
```

One transaction. From here the clock runs without you.

### 4. Nothing happens, on purpose

Between now and `expiresAt`, the approval works normally. DORT holds the signature and the
bounty, and does nothing else. Your allowance is untouched.

### 5. The approval removes itself

Once `block.timestamp` reaches `expiresAt`, anyone at all can call `execute`. The registry
replays your stored signature at the token, the allowance goes to zero, and whoever made the call
collects the bounty.

```text
anyone -> registry.execute(jobId)
       -> token.permit(you, theApp, 0, deadline, v, r, s)
       -> allowance is now zero
       -> bounty goes to the caller
```

You did not have to be online. You did not have to remember.

## Why a bounty

Because "automatically" has to mean something, and on a blockchain nothing runs by itself.
Somebody has to pay gas to send that transaction.

The bounty is what makes it worth their while. It is a public reward for a public service:
whoever performs the revocation gets paid for it. There is no privileged keeper, no allow list,
and no relationship to maintain. You can run it yourself if you like.

Read [Keepers and bounties](protocol/keepers.md) for how to size one, and what happens if you
size it too low.

## What if you change your mind

Call `cancel`. Only you can, and it works any time before the job runs.

```text
you -> registry.cancel(jobId)
    -> the job is marked cancelled
    -> your bounty comes straight back
```

Cancelling does not touch the approval itself. It only calls off the scheduled expiry.

## What if something goes wrong

There is exactly one escape hatch and it covers every case: **cancel and take your bounty back.**

That applies whether the token turned out not to support the right kind of permit, whether
somebody replayed your signature early, or whether you simply changed your mind. Your ETH is
never stuck anywhere you cannot reach it, and the protocol never held your tokens to begin with.

[Job lifecycle](protocol/lifecycle.md) sets out every state a job can be in and how it got there.

## What DORT never does

- It never moves your tokens. It does not call `transfer` or `transferFrom` and holds no token
  balances.
- It never increases an allowance. `execute` hardcodes a value of zero.
- It never needs a server. Any public RPC endpoint is enough to read the state and run a job.
