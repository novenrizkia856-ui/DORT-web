/**
 * Sets the token address in config/token.ts.
 *
 * Launch day is the one moment on this project where minutes matter, so the edit is a
 * command rather than a hunt through files:
 *
 *   npm run token 0xabc...123      publish an address
 *   npm run token clear            put the bar back to "Coming soon"
 *
 * It validates before writing. A bad paste stops here instead of reaching the site.
 */

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "config", "token.ts");
const LINE = /export const TOKEN_ADDRESS = "([^"]*)";/;
const SHAPE = /^0x[0-9a-fA-F]{40}$/;

const arg = (process.argv[2] ?? "").trim();

if (arg === "") {
  console.error("Usage: npm run token <address>   or   npm run token clear");
  process.exit(1);
}

const next = arg === "clear" ? "" : arg;

if (next !== "" && !SHAPE.test(next)) {
  console.error(`Not a valid address: ${JSON.stringify(next)}`);
  console.error("Expected 0x followed by 40 hex characters. Nothing was written.");
  process.exit(1);
}

const src = fs.readFileSync(FILE, "utf8");
const found = src.match(LINE);

if (!found) {
  console.error(`Could not find the TOKEN_ADDRESS line in ${FILE}. Nothing was written.`);
  process.exit(1);
}

const previous = found[1];

if (previous === next) {
  console.log(`Already set to ${next === "" ? "empty" : next}. Nothing to do.`);
  process.exit(0);
}

fs.writeFileSync(FILE, src.replace(LINE, `export const TOKEN_ADDRESS = "${next}";`), "utf8");

console.log(`  was:  ${previous === "" ? "(empty, bar reads Coming soon)" : previous}`);
console.log(`  now:  ${next === "" ? "(empty, bar reads Coming soon)" : next}`);
console.log("");

if (next === "") {
  console.log("  The bar is back to Coming soon.");
} else {
  console.log("  The bar now shows this address, with the copy button and explorer link live.");
  console.log("");
  console.log("  Next:  npm run build          confirm it compiles");
  console.log("         git commit && push     Vercel deploys from main");
  console.log("");
  console.log("  Copy that is now out of date and says no token exists:");
  console.log("    docs/reference/faq.md   the \"Is there a token?\" answer");
}
