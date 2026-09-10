# Quickstart

Protect your first approval. Takes a few minutes, costs a fraction of a cent in gas plus whatever
bounty you attach.

## What you need

- A browser wallet such as MetaMask or Rabby, or any mobile wallet that speaks WalletConnect
- A little ETH on Robinhood Chain for gas and the bounty
- A token approval you actually want to put a deadline on

## 1. Add Robinhood Chain to your wallet

The app offers to add it for you when you connect on the wrong network. If you would rather do it
by hand:

| Field | Value |
|---|---|
| Network name | Robinhood Chain |
| Chain ID | `4663` |
| Currency | ETH |
| RPC URL | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |

## 2. Find the pair you want to protect

You need two addresses:

- **The token**, the ERC 20 whose allowance you granted
- **The spender**, the contract you granted it to, usually a router or a vault

Both are visible on any block explorer under your wallet's approvals, or in the app that asked
for the approval in the first place.

## 3. Check the pair

Open the app, paste both addresses, and press **Check this pair**. You will see three things:

| What it shows | What it means |
|---|---|
| **Current allowance** | How much that spender can move right now. If this reads zero, there is nothing to expire yet. |
| **Supports permit** | Whether the token implements the canonical EIP 2612 permit. If this reads no, DORT cannot protect it. |
| **Token name and symbol** | A sanity check that you pasted the address you meant to. |

> **If "Supports permit" says no, stop here.** The token cannot be scheduled and the app will not
> let you try. See [Limitations](protocol/limitations.md) for which tokens are out of scope and
> why.

## 4. Choose when it ends

Pick one of the presets, or think of it this way: how long do you actually need this app to be
able to move your tokens?

- **24 hours** for a one off swap or a bridge you are using once
- **7 days** for something you are actively trading through
- **30 days** for a position you are managing
- **90 days** for a long lived vault you check on occasionally

You can always approve again afterwards. It is one transaction, the same one you did the first
time.

## 5. Set a bounty

The app suggests one, sized from the live gas price so a keeper actually profits from running it.
At the time of writing, running a job costs about **0.000016 ETH**, so a bounty of roughly
0.00005 ETH leaves a healthy margin.

> **Do not set it below the cost of running.** A job nobody will pick up is worse than no job at
> all, because you will believe you are protected when you are not. The app warns you if you go
> under, and it is not being fussy.

## 6. Sign and schedule

Two prompts in your wallet, in this order:

1. **A signature.** Free. This is the permit that will eventually zero the allowance. Your wallet
   will show it as typed data, and you should see `value: 0` in it.
2. **A transaction.** This registers the job and carries your bounty. This is the only one that
   costs gas.

Once the transaction confirms, the job appears under **Your schedules**.

## 7. Watch it, or forget it

Forgetting it is the point. But if you want to check:

- **Waiting** means the time has not arrived yet. The approval is live and working.
- **Ready to run** means it is due. Any keeper can now execute it, and so can you.
- **Done** means the allowance is zero.
- **Signature dead** means you signed another permit on that token, which invalidated this one.
  Cancel, take the bounty back, and schedule again.

## Doing it without the app

Nothing here needs the website. The registry is a public contract and its full interface is in
[DORTRegistry](contracts/registry.md). [Schedule an expiry](guides/schedule.md) walks the same
flow in code with viem.
