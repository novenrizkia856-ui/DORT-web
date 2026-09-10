"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { robinhoodChain } from "./chain";
import { NETWORK } from "@/config/contracts";

/** The minimum EIP 1193 surface. Both connectors satisfy it, so the rest of the app never cares
 *  which one is in use. */
type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
  disconnect?: () => Promise<void>;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export type ConnectorKind = "injected" | "walletconnect";

const PROJECT_ID = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();

/**
 * WalletConnect only appears when a project id is configured. Without one its own servers reject
 * the session, so offering the button would produce a dead end. Get an id at
 * https://dashboard.reown.com and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
 */
export const walletConnectAvailable = PROJECT_ID.length > 0;

const LAST_CONNECTOR = "dort:connector";

export type WalletState = {
  ready: boolean;
  hasInjected: boolean;
  address: Address | null;
  chainId: number | null;
  wrongChain: boolean;
  connecting: ConnectorKind | null;
  connector: ConnectorKind | null;
  error: string | null;
};

export function useWallet() {
  const provider = useRef<Eip1193 | null>(null);
  const [state, setState] = useState<WalletState>({
    ready: false,
    hasInjected: false,
    address: null,
    chainId: null,
    wrongChain: false,
    connecting: null,
    connector: null,
    error: null,
  });

  /* ------------------------------ shared wiring ----------------------------- */

  const bind = useCallback((p: Eip1193, kind: ConnectorKind) => {
    provider.current = p;

    const onAccounts = (...args: never[]) => {
      const accounts = args[0] as unknown as string[];
      const next = (accounts?.[0] as Address) ?? null;
      setState((s) => ({ ...s, address: next, connector: next ? kind : null }));
      if (!next) window.localStorage.removeItem(LAST_CONNECTOR);
    };
    const onChain = (...args: never[]) => {
      const raw = args[0] as unknown as string | number;
      const id = typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
      setState((s) => ({
        ...s,
        chainId: id,
        wrongChain: !!s.address && id !== NETWORK.chainIdMainnet,
      }));
    };
    const onDisconnect = () => {
      provider.current = null;
      window.localStorage.removeItem(LAST_CONNECTOR);
      setState((s) => ({ ...s, address: null, connector: null, wrongChain: false }));
    };

    p.on?.("accountsChanged", onAccounts);
    p.on?.("chainChanged", onChain);
    p.on?.("disconnect", onDisconnect);
  }, []);

  const adopt = useCallback(
    async (p: Eip1193, kind: ConnectorKind, accounts: string[]) => {
      const raw = (await p.request({ method: "eth_chainId" })) as string | number;
      const chainId = typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
      bind(p, kind);
      window.localStorage.setItem(LAST_CONNECTOR, kind);
      setState((s) => ({
        ...s,
        address: (accounts[0] as Address) ?? null,
        chainId,
        wrongChain: !!accounts[0] && chainId !== NETWORK.chainIdMainnet,
        connecting: null,
        connector: kind,
        error: null,
      }));
    },
    [bind]
  );

  /* -------------------------- restore a live session ------------------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const injected = typeof window !== "undefined" ? window.ethereum : undefined;
      const last = typeof window !== "undefined" ? window.localStorage.getItem(LAST_CONNECTOR) : null;

      setState((s) => ({ ...s, hasInjected: !!injected }));

      try {
        if (last === "walletconnect" && walletConnectAvailable) {
          const p = await initWalletConnect();
          const accounts = (p.accounts ?? []) as string[];
          if (!cancelled && accounts.length > 0) {
            await adopt(p as unknown as Eip1193, "walletconnect", accounts);
          }
        } else if (injected) {
          // eth_accounts never prompts, so a page load stays silent.
          const accounts = (await injected.request({ method: "eth_accounts" })) as string[];
          if (!cancelled && accounts.length > 0) {
            await adopt(injected, "injected", accounts);
          }
        }
      } catch {
        /* A failed restore just means nobody is connected yet. */
      } finally {
        if (!cancelled) setState((s) => ({ ...s, ready: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adopt]);

  /* --------------------------------- connect -------------------------------- */

  const connect = useCallback(
    async (kind: ConnectorKind) => {
      setState((s) => ({ ...s, connecting: kind, error: null }));
      try {
        if (kind === "injected") {
          const injected = window.ethereum;
          if (!injected) throw new Error("No injected wallet is available.");
          const accounts = (await injected.request({ method: "eth_requestAccounts" })) as string[];
          await adopt(injected, "injected", accounts);
        } else {
          const p = await initWalletConnect();
          await p.connect();
          await adopt(p as unknown as Eip1193, "walletconnect", (p.accounts ?? []) as string[]);
        }
      } catch (e) {
        setState((s) => ({ ...s, connecting: null, error: friendlyError(e) }));
      }
    },
    [adopt]
  );

  const disconnect = useCallback(async () => {
    try {
      await provider.current?.disconnect?.();
    } catch {
      /* Injected wallets have no disconnect. Dropping our own reference is enough. */
    }
    provider.current = null;
    window.localStorage.removeItem(LAST_CONNECTOR);
    setState((s) => ({ ...s, address: null, connector: null, wrongChain: false, error: null }));
  }, []);

  /* ------------------------------- chain switch ------------------------------ */

  const switchChain = useCallback(async () => {
    const p = provider.current;
    if (!p) return;
    const hexId = `0x${NETWORK.chainIdMainnet.toString(16)}`;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
      const code = (e as { code?: number })?.code;
      // 4902 means the wallet does not know this chain yet. Offer to add it.
      if (code === 4902 || code === -32603) {
        try {
          await p.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexId,
                chainName: NETWORK.name,
                nativeCurrency: { name: "Ether", symbol: NETWORK.nativeGasToken, decimals: 18 },
                rpcUrls: [NETWORK.rpcMainnet],
                blockExplorerUrls: [NETWORK.explorerMainnet],
              },
            ],
          });
        } catch (addErr) {
          setState((s) => ({ ...s, error: friendlyError(addErr) }));
        }
      } else {
        setState((s) => ({ ...s, error: friendlyError(e) }));
      }
    }
  }, []);

  const getWalletClient = useCallback((): WalletClient | null => {
    const p = provider.current;
    if (!p || !state.address) return null;
    return createWalletClient({
      account: state.address,
      chain: robinhoodChain,
      transport: custom(p as never),
    });
  }, [state.address]);

  return { ...state, walletConnectAvailable, connect, disconnect, switchChain, getWalletClient };
}

/* -------------------------------------------------------------------------- */

type WcProvider = {
  accounts?: string[];
  connect: () => Promise<void>;
  request: Eip1193["request"];
  on?: Eip1193["on"];
  removeListener?: Eip1193["removeListener"];
  disconnect?: () => Promise<void>;
};

let wcInstance: WcProvider | null = null;

/**
 * Loaded on demand, never at page load.
 *
 * The WalletConnect provider pulls in a few hundred kilobytes and most visitors will use an
 * injected wallet, so a dynamic import keeps it out of the initial bundle entirely. It is cached
 * after the first call so a reconnect does not re-initialise the session.
 */
async function initWalletConnect(): Promise<WcProvider> {
  if (wcInstance) return wcInstance;

  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");

  wcInstance = (await EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [NETWORK.chainIdMainnet],
    optionalChains: [NETWORK.chainIdMainnet],
    rpcMap: { [NETWORK.chainIdMainnet]: NETWORK.rpcMainnet },
    showQrModal: true,
    metadata: {
      name: "DORT",
      description: "Give every token approval an end date you choose.",
      url: typeof window !== "undefined" ? window.location.origin : "https://dort.app",
      icons: [
        typeof window !== "undefined" ? `${window.location.origin}/favicon.svg` : "",
      ].filter(Boolean),
    },
  })) as unknown as WcProvider;

  return wcInstance;
}

/** Turns a wallet or RPC rejection into one short sentence a person can act on. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: number })?.code;
  if (code === 4001) return "You rejected the request in your wallet.";
  if (code === -32002) return "Your wallet already has a pending request. Open it and finish that first.";

  const raw =
    (e as { shortMessage?: string })?.shortMessage ??
    (e as { message?: string })?.message ??
    String(e);

  if (/user rejected|user closed|modal closed/i.test(raw)) return "You closed the request before approving it.";
  if (/insufficient funds/i.test(raw)) return "Not enough ETH to cover the bounty plus gas.";
  if (/ExpiryNotInFuture/.test(raw)) return "That expiry time has already passed. Pick a later one.";
  if (/PermitDeadlineBeforeExpiry/.test(raw)) return "The permit deadline is earlier than the expiry.";
  if (/NotJobOwner/.test(raw)) return "Only the wallet that created this schedule can cancel it.";
  if (/JobAlreadyExecuted/.test(raw)) return "That schedule has already run.";
  if (/JobCancelled/.test(raw)) return "That schedule was already cancelled.";
  if (/JobNotYetEligible/.test(raw)) return "That schedule is not due yet.";
  if (/AllowanceNotCleared/.test(raw)) return "The token did not clear the allowance, so nothing was paid out.";
  if (/BountyTransferFailed/.test(raw)) return "The bounty transfer failed, so the whole call was reverted.";

  return raw.split("\n")[0].slice(0, 160);
}
