/**
 * Single source of truth for every contract, network and token value on the site.
 *
 * No component may hold a literal address string of its own. Import from here.
 *
 * Each field reads an optional NEXT_PUBLIC_ environment variable, falling back to
 * the value baked in below. An environment variable set on Vercel always wins, so
 * anything here can still be overridden without a code change.
 *
 * The registry and lens addresses are deployed, immutable and permanent, so they
 * are recorded here rather than left to configuration. The token fields stay empty
 * because no token has launched.
 */

const env = (value: string | undefined, fallback = ""): string =>
  value !== undefined && value !== "" ? value : fallback;

export const NETWORK = {
  name: "Robinhood Chain",
  chainIdMainnet: 4663,
  chainIdTestnet: 46630,
  nativeGasToken: "ETH",
  explorerMainnet: env(
    process.env.NEXT_PUBLIC_EXPLORER_MAINNET,
    "https://robinhoodchain.blockscout.com"
  ),
  explorerTestnet: env(
    process.env.NEXT_PUBLIC_EXPLORER_TESTNET,
    "https://explorer.testnet.chain.robinhood.com"
  ),
  rpcMainnet: env(process.env.NEXT_PUBLIC_RPC_MAINNET, "https://rpc.mainnet.chain.robinhood.com"),
  rpcTestnet: env(process.env.NEXT_PUBLIC_RPC_TESTNET, "https://rpc.testnet.chain.robinhood.com"),
};

export const CONTRACTS = {
  registry: {
    label: "DORT Registry",
    address: env(
      process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
      "0x638a279363f28f7c25aa3c5132eb5b99e198e1f1"
    ),
    deployedAt: env(process.env.NEXT_PUBLIC_REGISTRY_DEPLOYED_AT, "58736296"),
  },
  lens: {
    label: "DORT Lens",
    address: env(
      process.env.NEXT_PUBLIC_LENS_ADDRESS,
      "0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395"
    ),
    deployedAt: env(process.env.NEXT_PUBLIC_LENS_DEPLOYED_AT, "58736296"),
  },
};

export const TOKEN = {
  ticker: "DORT",
  contractAddress: env(process.env.NEXT_PUBLIC_TOKEN_ADDRESS),
  isLive: process.env.NEXT_PUBLIC_TOKEN_IS_LIVE === "true",
};

/**
 * The bar at the top of the page only shows a real address when the token is
 * flagged live AND an address is actually present. This keeps every piece of
 * token copy on the site consistent with one value.
 */
export const tokenIsPublished: boolean =
  TOKEN.isLive && TOKEN.contractAddress.trim().length > 0;
