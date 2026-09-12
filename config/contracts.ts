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
 * are recorded here rather than left to configuration. The token address lives in
 * its own file, config/token.ts, so that launch day is a one line change.
 */

import { TOKEN_ADDRESS } from "./token";

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

/**
 * The token.
 *
 * Launch day has to be fast, so there is exactly one thing to change: the address in
 * config/token.ts. Liveness is derived from it rather than kept as a separate flag,
 * because two switches are two chances to publish a half state under pressure.
 *
 * An environment variable still wins if one is set, so the address can also be pushed
 * from Vercel without a deploy from a machine.
 */
const tokenAddress = env(process.env.NEXT_PUBLIC_TOKEN_ADDRESS, TOKEN_ADDRESS).trim();

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;

/* A malformed address must never reach the page. Failing the build is the fastest
   possible feedback, and the alternative is a live bar showing a broken address that
   people will copy and paste into a wallet. */
if (tokenAddress !== "" && !ADDRESS_SHAPE.test(tokenAddress)) {
  throw new Error(
    `Token address is not a valid address: ${JSON.stringify(tokenAddress)}. ` +
      `Expected 0x followed by 40 hex characters. Fix config/token.ts, or leave it empty ` +
      `to keep the bar reading "Coming soon".`
  );
}

export const TOKEN = {
  ticker: "DORT",
  contractAddress: tokenAddress,
  isLive: tokenAddress !== "",
};

/** True once a real address is in place. Everything token shaped on the site reads this. */
export const tokenIsPublished: boolean = TOKEN.isLive;

/** The token's page on the explorer. Empty while nothing has launched. */
export const tokenExplorerUrl: string = tokenIsPublished
  ? `${NETWORK.explorerMainnet}/token/${TOKEN.contractAddress}`
  : "";
