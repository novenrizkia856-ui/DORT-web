# DORTLens

A read only helper so an interface can ask about many token and spender pairs in one call rather
than several dozen.

```text
0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395
```

1,783 bytes. No state, no owner, no payable function, no fallback and no receive. It cannot change
anything anywhere and can never hold a balance.

> The lens is a convenience, not a dependency. Everything DORT does works without it.

## Types

```solidity
struct AllowanceInfo {
    address token;
    address spender;
    uint256 allowance;     // meaningful only when allowanceRead is true
    uint256 nonce;         // meaningful only when permitLikely is true
    bool    allowanceRead; // the allowance call returned a 32 byte word
    bool    permitLikely;  // the token exposes both probed views
}
```

## Functions

### scanAllowances

```solidity
function scanAllowances(
    address owner,
    address[] calldata tokens,
    address[] calldata spenders
) external view returns (AllowanceInfo[] memory out)
```

Reads allowance and permit support for a list of pairs. `tokens[i]` is paired with `spenders[i]`.

A token that reverts, returns nothing, or has no code at all yields a row with its flags set
false rather than reverting the whole batch. That is the point: one badly behaved token in a list
of twenty should not take the other nineteen down with it.

**Reverts** `LengthMismatch` when the two arrays are different lengths.

```typescript
const rows = await lens.read.scanAllowances([owner, tokens, spenders]);
for (const row of rows) {
  if (!row.allowanceRead) continue;        // unreadable, skip
  if (row.allowance === 0n) continue;      // nothing to protect
  if (!row.permitLikely) continue;         // DORT cannot help here
  // offer this one to the user
}
```

### probePermit

```solidity
function probePermit(address token, address owner)
    external view returns (bool permitLikely, uint256 nonce)
```

Checks whether a token looks like it implements EIP 2612, and reads the owner's current nonce.

**What this proves.** The token exposes `nonces(address)` and `DOMAIN_SEPARATOR()`, both returning
a single word. That is the strongest signal obtainable from a static call, because `permit`
changes state and cannot be probed without a real signature.

**What this does not prove.** That the token's `permit` uses the canonical argument order. DAI's
older shape also exposes both of those views, so it reports true here while still being unusable
with DORT.

> Treat this as "worth offering to the user", never as a guarantee. The only real proof is a
> successful `execute`. See [Limitations](../protocol/limitations.md).

**The nonce is the useful half.** Record it when you schedule a job and compare it later: if it
has moved, the stored signature has been invalidated and the job can never run.

```typescript
const [permitLikely, currentNonce] = await lens.read.probePermit([token, owner]);
if (currentNonce > nonceWhenScheduled) {
  // dead signature, tell the user to cancel and reschedule
}
```

### tryAllowance

```solidity
function tryAllowance(address token, address owner, address spender)
    external view returns (bool ok, uint256 value)
```

Reads a single allowance without reverting on a bad token. `ok` is false when the call reverted,
returned the wrong number of bytes, or the address has no code.

## How the guarded reads work

Every token call is a `staticcall` whose failure is reported as a flag rather than bubbled up:

```solidity
function _tryReadWord(address target, bytes memory data)
    private view returns (bool ok, uint256 value)
{
    if (target.code.length == 0) return (false, 0);

    (bool success, bytes memory ret) = target.staticcall(data);
    if (!success || ret.length != 32) return (false, 0);

    return (true, abi.decode(ret, (uint256)));
}
```

Three distinct failure shapes, all handled:

| Shape | Why it needs handling |
|---|---|
| No code at the address | A call to a codeless address **succeeds** with empty return data, which would otherwise read as a silent success. |
| The call reverted | A plain ERC 20 has no `nonces`, so the call hits a non existent function and reverts. |
| Success with wrong length | A token with a permissive fallback returns success and zero bytes. Decoding that would report a confident, wrong answer. |

## Use it off chain

The lens is meant for `eth_call` from an interface. A token in the list could burn all the gas it
is given, so calling this from another contract on chain is not advised. It holds no funds and can
change no state, so the worst outcome of a hostile token is a failed read.

## ABI fragment

```json
[
  "function probePermit(address token, address owner) view returns (bool permitLikely, uint256 nonce)",
  "function tryAllowance(address token, address owner, address spender) view returns (bool ok, uint256 value)",
  "function scanAllowances(address owner, address[] tokens, address[] spenders) view returns ((address,address,uint256,uint256,bool,bool)[])"
]
```
