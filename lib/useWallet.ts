"use client";

import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { robinhoodChain } from "./chain";
import { NETWORK } from "@/config/contracts";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export type WalletState = {
  ready: boolean;
  hasWallet: boolean;
  address: Address | null;
  chainId: number | null;
  wrongChain: boolean;
  connecting: boolean;
  error: string | null;
};

/**
 * Injected wallet only: MetaMask, Rabby, Coinbase Wallet and anything else that puts an EIP 1193
 * provider on `window.ethereum`.
 *
 * There is no WalletConnect, so mobile wallets that rely on it will not appear. That is a
 * deliberate trade for a static site with no project id and no backend, and it is stated in the
 * UI rather than left for the user to discover.
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>({
    ready: false,
    hasWallet: false,
    address: null,
    chainId: null,
    wrongChain: false,
    connecting: false,
    error: null,
  });

  const readChain = useCallback(async (eth: Eip1193) => {
    const hex = (await eth.request({ method: "eth_chainId" })) as string;
    return Number.parseInt(hex, 16);
  }, []);

  /* Pick up an already authorised account on load, without prompting. */
  useEffect(() => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth) {
      setState((s) => ({ ...s, ready: true, hasWallet: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
        const chainId = await readChain(eth);
        if (cancelled) return;
        setState({
          ready: true,
          hasWallet: true,
          address: (accounts[0] as Address) ?? null,
          chainId,
          wrongChain: accounts[0] ? chainId !== NETWORK.chainIdMainnet : false,
          connecting: false,
          error: null,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, ready: true, hasWallet: true }));
      }
    })();

    const onAccounts = (...args: never[]) => {
      const accounts = args[0] as unknown as string[];
      setState((s) => ({ ...s, address: (accounts?.[0] as Address) ?? null }));
    };
    const onChain = (...args: never[]) => {
      const hex = args[0] as unknown as string;
      const id = Number.parseInt(hex, 16);
      setState((s) => ({ ...s, chainId: id, wrongChain: !!s.address && id !== NETWORK.chainIdMainnet }));
    };

    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      cancelled = true;
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [readChain]);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = await readChain(eth);
      setState((s) => ({
        ...s,
        address: (accounts[0] as Address) ?? null,
        chainId,
        wrongChain: chainId !== NETWORK.chainIdMainnet,
        connecting: false,
      }));
    } catch (e) {
      setState((s) => ({ ...s, connecting: false, error: friendlyError(e) }));
    }
  }, [readChain]);

  /** Asks the wallet to switch, and to add the chain first if it does not know it. */
  const switchChain = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    const hexId = `0x${NETWORK.chainIdMainnet.toString(16)}`;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        try {
          await eth.request({
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
    const eth = window.ethereum;
    if (!eth || !state.address) return null;
    return createWalletClient({
      account: state.address,
      chain: robinhoodChain,
      transport: custom(eth as never),
    });
  }, [state.address]);

  return { ...state, connect, switchChain, getWalletClient };
}

/** Turns a wallet or RPC rejection into one short sentence a person can act on. */
export function friendlyError(e: unknown): string {
  const code = (e as { code?: number })?.code;
  if (code === 4001) return "You rejected the request in your wallet.";
  if (code === -32002) return "Your wallet already has a pending request. Open it and finish that first.";

  const raw = (e as { shortMessage?: string; message?: string })?.shortMessage
    ?? (e as { message?: string })?.message
    ?? String(e);

  if (/insufficient funds/i.test(raw)) return "Not enough ETH to cover the bounty plus gas.";
  if (/ExpiryNotInFuture/.test(raw)) return "That expiry time has already passed. Pick a later one.";
  if (/PermitDeadlineBeforeExpiry/.test(raw)) return "The permit deadline is earlier than the expiry.";
  if (/NotJobOwner/.test(raw)) return "Only the wallet that created this schedule can cancel it.";
  if (/JobAlreadyExecuted/.test(raw)) return "That schedule has already run.";
  if (/JobCancelled/.test(raw)) return "That schedule was already cancelled.";
  if (/JobNotYetEligible/.test(raw)) return "That schedule is not due yet.";
  if (/AllowanceNotCleared/.test(raw)) return "The token did not clear the allowance, so nothing was paid out.";
  if (/BountyTransferFailed/.test(raw)) return "The bounty transfer failed, so the whole call was reverted.";

  // Trim viem's long multi line dumps down to the first meaningful line.
  return raw.split("\n")[0].slice(0, 160);
}
