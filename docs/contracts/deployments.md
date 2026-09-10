# Deployments

## Robinhood Chain mainnet

| Contract | Address |
|---|---|
| **DORTRegistry** | [`0x638a279363f28f7c25aa3c5132eb5b99e198e1f1`](https://robinhoodchain.blockscout.com/address/0x638a279363f28f7c25aa3c5132eb5b99e198e1f1) |
| **DORTLens** | [`0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395`](https://robinhoodchain.blockscout.com/address/0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395) |

| | |
|---|---|
| Chain ID | 4663 |
| Deployed at block | 58,736,296 |
| Constructor arguments | none, for either contract |
| Deployment cost | 0.000210 ETH, 1,519,336 gas |

Neither contract takes constructor arguments, because neither has an owner, an admin, a fee, or
any configurable parameter at all.

## Network

| | |
|---|---|
| Name | Robinhood Chain |
| Type | Arbitrum Orbit L2, settling to Ethereum |
| Mainnet chain ID | 4663 |
| Testnet chain ID | 46630 |
| Gas token | ETH |
| Mainnet RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Testnet RPC | `https://rpc.testnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

Multicall3 is deployed at the canonical address, so batching reads works as it does elsewhere.

## Build settings

To reproduce the bytecode:

| | |
|---|---|
| Compiler | `solc 0.8.36`, pinned, no floating pragma in `src/` |
| EVM version | `shanghai` |
| Optimizer | enabled, 200 runs |
| `via_ir` | off |
| Dependencies | OpenZeppelin Contracts v5.7.0, `ReentrancyGuard` only |

### Why Shanghai and not Cancun

Robinhood Chain is an Arbitrum Orbit chain. Cancun opcodes only became available on Orbit with
ArbOS 32, and that version has not been verified for this chain, so nothing deployed here may
emit `MCOPY`, `TSTORE` or `TLOAD`.

Both artefacts were scanned opcode by opcode, skipping `PUSH` immediate data, and contain none of
them:

```text
DORTRegistry    2,972 bytes of code | cancun opcodes: NONE
DORTLens        1,730 bytes of code | cancun opcodes: NONE
```

This also shaped a dependency choice. OpenZeppelin's `ERC20Permit` reaches `utils/Bytes.sol`,
which uses `mcopy`, so the canonical permit token used in testing implements EIP 2612 directly
rather than inheriting it.

## Verifying the deployment yourself

Both reads are free and need nothing but a public RPC endpoint.

```bash
cast code 0x638a279363f28f7c25aa3c5132eb5b99e198e1f1 --rpc-url https://rpc.mainnet.chain.robinhood.com
```

```bash
cast call 0x638a279363f28f7c25aa3c5132eb5b99e198e1f1 "nextJobId()(uint256)" --rpc-url https://rpc.mainnet.chain.robinhood.com
```

Compare the returned bytecode against a local build of the tagged commit. It should match byte for
byte, which is what was checked immediately after deployment.

## Source verification

> **Not yet published on the explorer.** Every route on `robinhoodchain.blockscout.com` sits
> behind a Cloudflare managed challenge that returns 403 to any non browser client, so
> `forge verify-contract` cannot reach it. The v1 API, the v2 API and the
> `explorer.mainnet.chain.robinhood.com` alias all land on the same protected host.

That is an explorer side restriction, not a problem with the contracts or the build. Submitting
the same payload through a browser works, and the standard JSON input for both contracts is
prepared in the repository under `audit/verification/`, with these settings:

| Field | Value |
|---|---|
| Compiler | `v0.8.36+commit.8a079791` |
| Optimization | enabled |
| Optimizer runs | `200` |
| EVM version | `shanghai` |
| License | MIT |
| Constructor arguments | leave empty |

Until this is done, the claim that the deployed bytecode matches the reviewed source is one you
have to take on trust rather than check. That matters, because the entire trust model is "the
bytecode is the whole story".

## Testnet

Not deployed. The scripts target chain 46630 and are ready, but the protocol went straight to
mainnet. A local Anvil node running with the testnet chain id was used as a stand in during
development, and the full lifecycle was verified against it.
