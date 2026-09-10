# DORTRegistry

The protocol. It stores jobs, custodies bounties, and performs the revocation.

```text
0x638a279363f28f7c25aa3c5132eb5b99e198e1f1
```

Robinhood Chain mainnet, chain 4663. 3,025 bytes of runtime bytecode. No owner, no admin, no
pause, no upgrade path.

## Types

```solidity
struct Job {
    address owner;          // created it, and the only address that may cancel
    uint8   v;              // signature recovery byte
    bool    executed;       // terminal
    bool    cancelled;      // terminal
    address token;          // the EIP 2612 token
    address spender;        // whose allowance gets zeroed
    uint256 expiresAt;      // earliest timestamp execute may succeed
    uint256 permitDeadline; // deadline signed into the permit
    bytes32 r;              // signature r
    bytes32 s;              // signature s
    uint256 bounty;         // ETH held for the executor, zeroed on settlement
}
```

## State

### nextJobId

```solidity
function nextJobId() external view returns (uint256)
```

The id that will be assigned to the next job. Ids start at zero and only increment, so this is
also the number of jobs ever created.

## Writing

### scheduleExpiry

```solidity
function scheduleExpiry(
    address token,
    address spender,
    uint256 expiresAt,
    uint256 permitDeadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external payable returns (uint256 jobId)
```

Registers an expiry. The ETH sent with the call becomes the bounty.

| Parameter | Meaning |
|---|---|
| `token` | The EIP 2612 token holding the allowance. |
| `spender` | The address whose allowance will be zeroed. |
| `expiresAt` | Earliest timestamp `execute` may succeed. Must be strictly in the future. |
| `permitDeadline` | The deadline signed into the permit. Must be at or after `expiresAt`, and in practice should be far beyond it. |
| `v`, `r`, `s` | The signature over the permit message, with a value of zero. |

**Reverts**

- `ExpiryNotInFuture` when `expiresAt <= block.timestamp`
- `PermitDeadlineBeforeExpiry` when `permitDeadline < expiresAt`

**Emits** `ScheduleCreated`

The contract does not and cannot verify the signature. Only the token can, and it does so at
`execute` time. A malformed signature therefore produces a job that will always revert on
`execute`, and the owner recovers their bounty with `cancel`. No funds are at risk from a bad
signature.

> Sending zero ETH is allowed. The job will simply never be attractive to a keeper. See
> [Keepers and bounties](../protocol/keepers.md).

### execute

```solidity
function execute(uint256 jobId) external
```

Runs an eligible job. Callable by **anyone** once `block.timestamp >= expiresAt`. That is the
whole point: the owner does not have to come back.

What it does, in order:

1. Validates the job exists, is not executed, is not cancelled, and is due.
2. Marks it executed and zeroes its stored bounty, **before any external call**.
3. Calls `permit(owner, spender, 0, permitDeadline, v, r, s)` on the token.
4. Asserts the allowance is now actually zero.
5. Forwards the bounty to `msg.sender`, reverting if that transfer fails.
6. Emits `ApprovalExpired`.

**Reverts**

- `JobDoesNotExist` for an id that was never created
- `JobAlreadyExecuted`
- `JobCancelled`
- `JobNotYetEligible` when the time has not arrived
- `AllowanceNotCleared` when the token's `permit` returned without clearing the allowance
- `BountyTransferFailed` when the ETH transfer to the caller fails
- Anything the token's own `permit` reverts with

**Emits** `ApprovalExpired`

Carries a reentrancy guard. If the token's `permit` reverts, the whole transaction reverts and
the job stays unexecuted, which is the correct outcome. The usual cause is that the owner already
changed that allowance by another route, consuming the token's nonce.

### cancel

```solidity
function cancel(uint256 jobId) external
```

Cancels a job that has not run, and refunds its bounty to the owner. Only the address that
created the job may call it. Available both before and after the job became eligible.

**Reverts**

- `JobDoesNotExist`
- `NotJobOwner`
- `JobAlreadyExecuted`
- `JobCancelled`
- `BountyTransferFailed` when the refund cannot be delivered

**Emits** `ScheduleCancelled`

This is the escape hatch for every way a job can become unrunnable: a signature invalidated by a
front run, a token that turns out not to implement canonical permit, or a change of mind.
Cancelling does not touch the underlying approval. It only calls off the scheduled expiry.

## Reading

### getJob

```solidity
function getJob(uint256 jobId) external view returns (Job memory)
```

Returns the whole struct. An id that was never created returns a zeroed struct rather than
reverting, so compare `owner` against the zero address, or check `jobId < nextJobId`.

A settled job reports `bounty == 0`, which is correct: it owes nothing any more. The original
amount is in the `ApprovalExpired` or `ScheduleCancelled` event.

### isExecutable

```solidity
function isExecutable(uint256 jobId) external view returns (bool)
```

True when the job exists, is neither executed nor cancelled, and its time has come. Convenience
for keepers, so they can filter candidates with one call instead of reassembling the rules off
chain and risking a disagreement with the contract.

Note that this returning `true` does not guarantee `execute` will succeed. The token's own
verification still has to pass, and a stale nonce will fail there.

## Errors

| Error | Raised by | Meaning |
|---|---|---|
| `ExpiryNotInFuture` | `scheduleExpiry` | `expiresAt` is not strictly in the future |
| `PermitDeadlineBeforeExpiry` | `scheduleExpiry` | The job could never succeed, so it is refused |
| `JobDoesNotExist` | `execute`, `cancel` | No job under this id |
| `JobAlreadyExecuted` | `execute`, `cancel` | Terminal state reached |
| `JobCancelled` | `execute`, `cancel` | Terminal state reached |
| `JobNotYetEligible` | `execute` | Too early |
| `NotJobOwner` | `cancel` | Caller did not create this job |
| `BountyTransferFailed` | `execute`, `cancel` | The ETH transfer failed, so the call reverted |
| `AllowanceNotCleared` | `execute` | The token accepted the call without clearing the allowance |

## Events

```solidity
event ScheduleCreated(
    uint256 indexed jobId,
    address indexed owner,
    address indexed token,
    address spender,
    uint256 expiresAt,
    uint256 permitDeadline,
    uint256 bounty
);

event ApprovalExpired(
    uint256 indexed jobId,
    address indexed executor,
    address indexed token,
    address owner,
    address spender,
    uint256 bounty
);

event ScheduleCancelled(uint256 indexed jobId, address indexed owner, uint256 bounty);
```

`owner` is indexed on `ScheduleCreated`, so every job an address ever created comes back from one
log query:

```typescript
const logs = await client.getLogs({
  address: REGISTRY,
  event: parseAbiItem(
    "event ScheduleCreated(uint256 indexed jobId, address indexed owner, address indexed token, address spender, uint256 expiresAt, uint256 permitDeadline, uint256 bounty)"
  ),
  args: { owner },
  fromBlock: 58736296n,
  toBlock: "latest",
});
```

## ABI fragment

```json
[
  "function nextJobId() view returns (uint256)",
  "function scheduleExpiry(address token, address spender, uint256 expiresAt, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable returns (uint256)",
  "function execute(uint256 jobId)",
  "function cancel(uint256 jobId)",
  "function isExecutable(uint256 jobId) view returns (bool)",
  "function getJob(uint256 jobId) view returns ((address,uint8,bool,bool,address,address,uint256,uint256,bytes32,bytes32,uint256))"
]
```
