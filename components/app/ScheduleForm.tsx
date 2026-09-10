"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, formatUnits, isAddress, parseEther, parseSignature, type Address } from "viem";
import { publicClient, REGISTRY, explorerTx } from "@/lib/chain";
import { registryAbi } from "@/lib/abi";
import {
  bountyGuidance,
  inspectPair,
  permitDeadlineFor,
  type BountyGuidance,
  type TokenCheck,
} from "@/lib/dort";
import { friendlyError, type WalletState } from "@/lib/useWallet";
import type { WalletClient } from "viem";

const PRESETS: { label: string; seconds: bigint }[] = [
  { label: "24 hours", seconds: 86_400n },
  { label: "7 days", seconds: 604_800n },
  { label: "30 days", seconds: 2_592_000n },
  { label: "90 days", seconds: 7_776_000n },
];

type Phase = "idle" | "checking" | "signing" | "confirming" | "done";

export default function ScheduleForm({
  wallet,
  getWalletClient,
  onScheduled,
}: {
  wallet: WalletState;
  getWalletClient: () => WalletClient | null;
  onScheduled: () => void;
}) {
  const [token, setToken] = useState("");
  const [spender, setSpender] = useState("");
  const [preset, setPreset] = useState(1);
  const [bountyEth, setBountyEth] = useState("");
  const [check, setCheck] = useState<TokenCheck | null>(null);
  const [guide, setGuide] = useState<BountyGuidance | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const owner = wallet.address;
  const pairValid = isAddress(token) && isAddress(spender);

  /* Suggest a bounty from the live gas price, so it is never below what a keeper needs. */
  useEffect(() => {
    bountyGuidance()
      .then((g) => {
        setGuide(g);
        setBountyEth((prev) => (prev === "" ? trimEth(formatEther(g.suggested)) : prev));
      })
      .catch(() => {});
  }, []);

  const runCheck = useCallback(async () => {
    if (!pairValid || !owner) return;
    setPhase("checking");
    setError(null);
    setCheck(null);
    try {
      setCheck(await inspectPair(token as Address, owner, spender as Address));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPhase("idle");
    }
  }, [pairValid, owner, token, spender]);

  const schedule = useCallback(async () => {
    const client = getWalletClient();
    if (!client || !owner || !check || !check.domain) return;

    setError(null);
    setTxHash(null);

    let bounty: bigint;
    try {
      bounty = parseEther(bountyEth || "0");
    } catch {
      setError("That bounty amount is not a valid number.");
      return;
    }

    try {
      const latest = await publicClient.getBlock();
      const expiresAt = latest.timestamp + PRESETS[preset].seconds;
      const deadline = permitDeadlineFor(expiresAt);

      setPhase("signing");
      const signature = await client.signTypedData({
        account: owner,
        domain: check.domain,
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: {
          owner,
          spender: check.spender,
          value: 0n,
          nonce: check.nonce,
          deadline,
        },
      });

      const { r, s, v, yParity } = parseSignature(signature);
      const vByte = Number(v ?? BigInt(yParity === 1 ? 28 : 27));

      // Simulate before asking for a transaction, so a doomed job never costs gas.
      setPhase("confirming");
      const { request } = await publicClient.simulateContract({
        account: owner,
        address: REGISTRY,
        abi: registryAbi,
        functionName: "scheduleExpiry",
        args: [check.token, check.spender, expiresAt, deadline, vByte, r, s],
        value: bounty,
      });

      const hash = await client.writeContract(request);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setPhase("done");
      setCheck(null);
      setToken("");
      setSpender("");
      onScheduled();
    } catch (e) {
      setError(friendlyError(e));
      setPhase("idle");
    }
  }, [getWalletClient, owner, check, bountyEth, preset, onScheduled]);

  const bountyWei = safeParseEther(bountyEth);
  const bountyTooLow = guide && bountyWei !== null && bountyWei < guide.breakEven;
  const allowanceIsZero = check && check.allowance === 0n;

  return (
    <div className="panel">
      <div className="panel-h">
        <h3>Protect an approval</h3>
        <p>
          Point DORT at a token and the app you approved. It ends that permission at the time you
          pick.
        </p>
      </div>

      <label className="fld">
        <span className="fld-k">Token address</span>
        <input
          className="fld-i mono"
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          placeholder="0x..."
          spellCheck={false}
        />
      </label>

      <label className="fld">
        <span className="fld-k">Spender address, the app you approved</span>
        <input
          className="fld-i mono"
          value={spender}
          onChange={(e) => setSpender(e.target.value.trim())}
          placeholder="0x..."
          spellCheck={false}
        />
      </label>

      <button className="btn btn-line btn-lg wide" onClick={runCheck} disabled={!pairValid || phase === "checking"}>
        {phase === "checking" ? "Checking..." : "Check this pair"}
      </button>

      {check && (
        <div className="check">
          <div className="check-row">
            <span>Token</span>
            <b>
              {check.name} <span className="mono dim">{check.symbol}</span>
            </b>
          </div>
          <div className="check-row">
            <span>Current allowance</span>
            <b className={check.allowance === 0n ? "warnv" : "okv"}>
              {formatUnits(check.allowance, check.decimals)} {check.symbol}
            </b>
          </div>
          <div className="check-row">
            <span>Supports permit</span>
            <b className={check.domain ? "okv" : "badv"}>{check.domain ? "Yes" : "No"}</b>
          </div>

          {!check.domain && (
            <p className="note bad">
              This token cannot be protected by DORT. Its permit signature does not match the
              standard one, so a schedule would never run.
            </p>
          )}

          {allowanceIsZero && check.domain && (
            <p className="note warn">
              This allowance is already zero. There is nothing to expire yet. Approve first, then
              come back.
            </p>
          )}
        </div>
      )}

      {check?.domain && (
        <>
          <div className="fld">
            <span className="fld-k">End the approval in</span>
            <div className="presets">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  className={`preset${i === preset ? " on" : ""}`}
                  onClick={() => setPreset(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="fld">
            <span className="fld-k">Bounty for whoever runs it</span>
            <div className="fld-row">
              <input
                className="fld-i mono"
                value={bountyEth}
                onChange={(e) => setBountyEth(e.target.value.trim())}
                placeholder="0.0"
                spellCheck={false}
              />
              <span className="fld-suffix">ETH</span>
            </div>
          </label>

          {guide && (
            <p className={`note${bountyTooLow ? " warn" : ""}`}>
              {bountyTooLow ? (
                <>
                  Below the cost of running it, about {trimEth(formatEther(guide.breakEven))} ETH
                  right now. Nobody will pick this up.
                </>
              ) : (
                <>
                  Running this costs a keeper about {trimEth(formatEther(guide.breakEven))} ETH at
                  the current gas price. You get any unspent bounty back if you cancel.
                </>
              )}
            </p>
          )}

          <button
            className="btn btn-accent btn-lg wide"
            onClick={schedule}
            disabled={phase === "signing" || phase === "confirming"}
          >
            {phase === "signing"
              ? "Sign in your wallet..."
              : phase === "confirming"
                ? "Confirming..."
                : "Sign and schedule"}
          </button>

          <p className="note dim">
            Two steps in your wallet. One free signature, then one transaction that carries the
            bounty.
          </p>
        </>
      )}

      {error && <p className="note bad">{error}</p>}

      {phase === "done" && txHash && (
        <p className="note ok">
          Scheduled.{" "}
          <a href={explorerTx(txHash)} target="_blank" rel="noopener noreferrer">
            View the transaction
          </a>
        </p>
      )}
    </div>
  );
}

function safeParseEther(v: string): bigint | null {
  try {
    return parseEther(v || "0");
  } catch {
    return null;
  }
}

/** Keeps long wei strings readable without pretending to more precision than matters. */
function trimEth(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(2);
  return String(Number(n.toFixed(6)));
}
