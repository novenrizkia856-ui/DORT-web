"use client";

import { useCallback, useEffect, useState } from "react";
import { annotateNonces, executableJobs, jobsForOwner, type Job } from "@/lib/dort";
import { publicClient, explorerAddress, REGISTRY, LENS } from "@/lib/chain";
import { useWallet } from "@/lib/useWallet";
import { NETWORK } from "@/config/contracts";
import ScheduleForm from "./ScheduleForm";
import JobList from "./JobList";

export default function Dapp() {
  const wallet = useWallet();
  const { address, getWalletClient } = wallet;

  const [mine, setMine] = useState<Job[]>([]);
  const [ready, setReady] = useState<Job[]>([]);
  const [now, setNow] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"mine" | "keeper">("mine");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const block = await publicClient.getBlock();
      setNow(block.timestamp);

      const [own, executable] = await Promise.all([
        address ? jobsForOwner(address) : Promise.resolve([]),
        executableJobs(),
      ]);

      setMine(address ? await annotateNonces(own, address) : []);
      setReady(executable);
    } catch {
      /* A read failure leaves the last good view in place rather than blanking the page. */
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  /* ----------------------------- gate states ----------------------------- */

  if (!wallet.ready) {
    return <div className="gate"><p className="empty">Loading...</p></div>;
  }

  if (!wallet.hasWallet) {
    return (
      <div className="gate">
        <h2>No wallet found</h2>
        <p>
          DORT needs a browser wallet such as MetaMask or Rabby. Install one, then reload this
          page.
        </p>
        <p className="note dim">
          Mobile wallets that connect over WalletConnect are not supported yet.
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="gate">
        <h2>Connect your wallet</h2>
        <p>
          Everything here reads from the chain. Nothing is stored on a server, because there is no
          server.
        </p>
        <button className="btn btn-accent btn-lg" onClick={wallet.connect} disabled={wallet.connecting}>
          {wallet.connecting ? "Check your wallet..." : "Connect wallet"}
        </button>
        {wallet.error && <p className="note bad">{wallet.error}</p>}
      </div>
    );
  }

  if (wallet.wrongChain) {
    return (
      <div className="gate">
        <h2>Wrong network</h2>
        <p>
          DORT lives on {NETWORK.name}. Your wallet is on chain {wallet.chainId}.
        </p>
        <button className="btn btn-accent btn-lg" onClick={wallet.switchChain}>
          Switch to {NETWORK.name}
        </button>
        {wallet.error && <p className="note bad">{wallet.error}</p>}
      </div>
    );
  }

  /* ------------------------------- connected ------------------------------ */

  return (
    <>
      <div className="acct">
        <span className="acct-dot" />
        <span className="mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
        <span className="acct-net">{NETWORK.name}</span>
        <button className="acct-refresh" onClick={refresh} disabled={loading}>
          {loading ? "Reading..." : "Refresh"}
        </button>
      </div>

      <ScheduleForm wallet={wallet} getWalletClient={getWalletClient} onScheduled={refresh} />

      <div className="panel">
        <div className="tabs">
          <button className={`tab${tab === "mine" ? " on" : ""}`} onClick={() => setTab("mine")}>
            Your schedules {mine.length > 0 && <span className="tab-n">{mine.length}</span>}
          </button>
          <button className={`tab${tab === "keeper" ? " on" : ""}`} onClick={() => setTab("keeper")}>
            Ready to run {ready.length > 0 && <span className="tab-n">{ready.length}</span>}
          </button>
        </div>

        {tab === "mine" ? (
          <JobList
            jobs={mine}
            now={now}
            mode="own"
            getWalletClient={getWalletClient}
            onChanged={refresh}
          />
        ) : (
          <>
            <p className="note dim">
              Anyone can run a schedule once it is due, and collect its bounty. That is how an
              approval ends without its owner being there.
            </p>
            <JobList
              jobs={ready}
              now={now}
              mode="keeper"
              getWalletClient={getWalletClient}
              onChanged={refresh}
            />
          </>
        )}
      </div>

      <div className="contracts">
        <span>Contracts</span>
        <a href={explorerAddress(REGISTRY)} target="_blank" rel="noopener noreferrer" className="mono">
          Registry {REGISTRY.slice(0, 6)}…{REGISTRY.slice(-4)}
        </a>
        <a href={explorerAddress(LENS)} target="_blank" rel="noopener noreferrer" className="mono">
          Lens {LENS.slice(0, 6)}…{LENS.slice(-4)}
        </a>
      </div>
    </>
  );
}
