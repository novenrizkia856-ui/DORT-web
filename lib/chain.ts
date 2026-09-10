import { createPublicClient, defineChain, http } from "viem";
import { NETWORK, CONTRACTS } from "@/config/contracts";

/**
 * Robinhood Chain, as viem needs it. Values come from config/contracts.ts so there is still
 * exactly one place any of this is defined.
 */
export const robinhoodChain = defineChain({
  id: NETWORK.chainIdMainnet,
  name: NETWORK.name,
  nativeCurrency: { name: "Ether", symbol: NETWORK.nativeGasToken, decimals: 18 },
  rpcUrls: { default: { http: [NETWORK.rpcMainnet] } },
  blockExplorers: {
    default: { name: "Blockscout", url: NETWORK.explorerMainnet },
  },
  contracts: {
    // Verified present on chain at the canonical address, so viem may batch reads.
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

/** Read only client. Never needs a wallet, so the page works before anyone connects. */
export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(NETWORK.rpcMainnet, { batch: true }),
});

export const REGISTRY = CONTRACTS.registry.address as `0x${string}`;
export const LENS = CONTRACTS.lens.address as `0x${string}`;

/** Block the registry was deployed in. Log scans start here rather than at genesis. */
export const REGISTRY_DEPLOY_BLOCK = BigInt(CONTRACTS.registry.deployedAt || "0");

export const explorerAddress = (a: string) => `${NETWORK.explorerMainnet}/address/${a}`;
export const explorerTx = (h: string) => `${NETWORK.explorerMainnet}/tx/${h}`;
