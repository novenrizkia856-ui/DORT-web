"use client";

import { useCallback, useState } from "react";
import { formatEther, type WalletClient } from "viem";
import { publicClient, REGISTRY, explorerAddress } from "@/lib/chain";
import { registryAbi } from "@/lib/abi";
import { jobStatus, type Job, type JobStatus } from "@/lib/dort";
import { friendlyError } from "@/lib/useWallet";

const LABEL: Record<JobStatus, string> = {
  waiting: "Waiting",
  ready: "Ready to run",
  executed: "Done",
  cancelled: "Cancelled",
  stale: "Signature dead",
};

export default function JobList({
  jobs,
  now,
  mode,
  getWalletClient,
  onChanged,
}: {
  jobs: Job[];
  now: bigint;
  /** "own" shows cancel, "keeper" shows execute. */
  mode: "own" | "keeper";
  getWalletClient: () => WalletClient | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = useCallback(
    async (job: Job, fn: "cancel" | "execute") => {
      const client = getWalletClient();
      if (!client) return;
      setBusy(job.id);
      setError(null);
      try {
        const { request } = await publicClient.simulateContract({
          account: client.account?.address,
          address: REGISTRY,
          abi: registryAbi,
          functionName: fn,
          args: [job.id],
        });
        const hash = await client.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        onChanged();
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, onChanged]
  );

  if (jobs.length === 0) {
    return (
      <p className="empty">
        {mode === "own"
          ? "Nothing scheduled yet. Protect an approval above and it appears here."
          : "Nothing is due right now."}
      </p>
    );
  }

  return (
    <>
      {error && <p className="note bad">{error}</p>}
      <div className="joblist">
        {jobs.map((job) => {
          const status = jobStatus(job, now);
          const canCancel = mode === "own" && !job.executed && !job.cancelled;
          const canExecute = mode === "keeper" && status === "ready";
          return (
            <div className={`job job-${status}`} key={String(job.id)}>
              <div className="job-top">
                <span className="job-sym">{job.symbol || "Token"}</span>
                <span className={`job-badge b-${status}`}>{LABEL[status]}</span>
              </div>

              <dl className="job-rows">
                <div>
                  <dt>Spender</dt>
                  <dd className="mono">
                    <a href={explorerAddress(job.spender)} target="_blank" rel="noopener noreferrer">
                      {short(job.spender)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>{when(job.expiresAt, now)}</dd>
                </div>
                <div>
                  <dt>Bounty</dt>
                  <dd className="mono">{formatEther(job.bounty)} ETH</dd>
                </div>
              </dl>

              {status === "stale" && (
                <p className="note warn">
                  You signed another permit on this token, so this signature no longer works.
                  Cancel to take the bounty back, then schedule again.
                </p>
              )}

              {(canCancel || canExecute) && (
                <div className="job-cta">
                  {canCancel && (
                    <button
                      className="btn btn-line"
                      onClick={() => act(job, "cancel")}
                      disabled={busy === job.id}
                    >
                      {busy === job.id ? "Working..." : "Cancel and refund"}
                    </button>
                  )}
                  {canExecute && (
                    <button
                      className="btn btn-accent"
                      onClick={() => act(job, "execute")}
                      disabled={busy === job.id}
                    >
                      {busy === job.id ? "Working..." : `Run it, earn ${formatEther(job.bounty)} ETH`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Plain language time, never a bare timestamp. */
function when(ts: bigint, now: bigint): string {
  const diff = Number(ts - now);
  const date = new Date(Number(ts) * 1000).toLocaleString();
  if (diff <= 0) return `${date}, already due`;

  const mins = Math.round(diff / 60);
  if (mins < 60) return `in ${mins} minutes`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hours`;
  return `in ${Math.round(hours / 24)} days`;
}
