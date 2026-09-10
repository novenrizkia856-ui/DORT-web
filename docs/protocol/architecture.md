# Architecture

Two contracts, roughly five kilobytes of bytecode between them, and no server anywhere.

## The pieces

```text
                    signs a permit, off chain, free
   ┌────────┐  ────────────────────────────────────────┐
   │ owner  │                                          │
   └───┬────┘                                          ▼
       │  scheduleExpiry(...) + bounty        ┌──────────────────┐
       └─────────────────────────────────────▶│  DORTRegistry    │
                                              │  holds the job   │
   ┌────────┐  execute(jobId)                 │  holds the ETH   │
   │ keeper │────────────────────────────────▶│                  │
   └────────┘  ◀────────── bounty ────────────└────────┬─────────┘
                                                       │
                                     permit(owner, spender, 0, ...)
                                                       ▼
                                              ┌──────────────────┐
                                              │  the ERC 20      │
                                              │  allowance -> 0  │
                                              └──────────────────┘

   ┌────────┐  read only, never writes        ┌──────────────────┐
   │ any UI │────────────────────────────────▶│  DORTLens        │
   └────────┘                                 └──────────────────┘
```

### DORTRegistry

The protocol. It stores jobs, custodies bounties, and performs the revocation. It is the only
contract that holds anything or changes anything.

3,025 bytes of runtime bytecode. Five external functions, three of which change state.

### DORTLens

A read only helper that exists so a user interface can ask about many token and spender pairs in
one call rather than several dozen. It has no state, no owner, no payable function, and no
fallback. It cannot change anything anywhere and can never hold a balance.

1,783 bytes. It is a convenience, not a dependency: everything DORT does works without it.

### The token

Any ERC 20 that implements the canonical EIP 2612 `permit`. DORT does not wrap it, does not hold
it, and does not require anything of it beyond that one function.

## What is deliberately absent

| Not present | Why |
|---|---|
| Owner or admin role | There is nothing an admin could usefully do that a user cannot, and plenty they could do that a user would not want. |
| Pause switch | A pause on a revocation protocol would mean freezing people's ability to revoke. |
| Upgrade path or proxy | The deployed bytecode is the whole promise. A proxy would make that promise conditional. |
| Oracle | Nothing here depends on a price or any off chain fact. Time comes from the block. |
| Backend | A public RPC endpoint is enough to read every job and execute any eligible one. |
| Token custody | The registry never calls `transfer` or `transferFrom` and holds no token balances. |

The only asset the registry ever holds is ETH, and only ever as a bounty attached to a specific
job. That constraint is what makes the accounting provable: its balance is always exactly the sum
of the bounties on jobs that are neither executed nor cancelled.

## Storage

One counter and one mapping.

```solidity
uint256 public nextJobId;
mapping(uint256 jobId => Job job) private _jobs;
```

Job ids start at zero and only ever increment, so `nextJobId` doubles as the number of jobs ever
created. A job is never deleted, only marked.

```solidity
struct Job {
    address owner;          // slot 0, packed with the three fields below
    uint8   v;              // slot 0
    bool    executed;       // slot 0
    bool    cancelled;      // slot 0
    address token;          // slot 1
    address spender;        // slot 2
    uint256 expiresAt;      // slot 3
    uint256 permitDeadline; // slot 4
    bytes32 r;              // slot 5
    bytes32 s;              // slot 6
    uint256 bounty;         // slot 7
}
```

`expiresAt` and `permitDeadline` are full `uint256` rather than packed into something smaller.
That is deliberate. `permitDeadline` has to be reproduced byte for byte when the token verifies
the signature, and `type(uint256).max` is a very common deadline in real wallets. Narrowing it
would either truncate a legitimate value or reject it, so the extra slot is accepted.

## The trust boundary

DORT calls out to exactly two addresses, both supplied by the user who created the job:

1. **The token**, when it calls `permit` and then reads `allowance` back.
2. **The bounty recipient**, when it forwards ETH.

Both are treated as hostile. Every state change is written before either call happens, and both
state changing functions carry a reentrancy guard on top of that. See
[Security model](security.md) for how each vector was tested.

## Sizes and settings

| | |
|---|---|
| Compiler | solc 0.8.36, pinned, no floating pragma |
| EVM target | `shanghai` |
| Optimizer | enabled, 200 runs, `via_ir` off |
| DORTRegistry runtime | 3,025 bytes |
| DORTLens runtime | 1,783 bytes |
| Dependencies in `src/` | OpenZeppelin `ReentrancyGuard`, nothing else |

The Shanghai target is not an oversight. Robinhood Chain is an Arbitrum Orbit chain, and Cancun
opcodes only became available on Orbit with ArbOS 32, which has not been verified for this chain.
Both deployed artefacts were scanned opcode by opcode and contain no `MCOPY`, `TSTORE`, `TLOAD`,
`BLOBHASH` or `BLOBBASEFEE`.
