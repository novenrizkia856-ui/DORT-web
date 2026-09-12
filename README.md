# DORT Web

DORT gives every ERC 20 token approval a self chosen expiry date, on Robinhood Chain.

This repo is both halves of the front end: the marketing page at `/` and the working app at
`/app`. Next.js App Router with `output: "export"`, so the whole thing deploys as plain static
files with no server behind it.

The contracts live in a separate repo, `DORT-contracts`, and are deployed:

| Contract | Address |
|---|---|
| DORTRegistry | [`0x638a279363f28f7c25aa3c5132eb5b99e198e1f1`](https://robinhoodchain.blockscout.com/address/0x638a279363f28f7c25aa3c5132eb5b99e198e1f1) |
| DORTLens | [`0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395`](https://robinhoodchain.blockscout.com/address/0x96bf04abbbcc39e0f06cb19cf5b4df54ac949395) |

---

## Running locally

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run build` writes a fully static site to `out/`. To preview that output:

```bash
npx serve out
```

---

## Configuration

Every contract, network and token value comes from one file,
[`config/contracts.ts`](config/contracts.ts). No component holds a literal address of its own.

Each field reads an optional `NEXT_PUBLIC_` environment variable and falls back to the value
baked in there. An environment variable set on Vercel always wins, so anything can be overridden
without a code change. Every variable is prefixed `NEXT_PUBLIC_` because all of these values are
public by nature.

The registry and lens addresses are recorded in the file rather than left to configuration,
because they are deployed and immutable and will not change.

### The one thing you still need to set

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, from <https://dashboard.reown.com>. Without it the app
works, but only with browser wallets. See the app section below.

### Publishing the token address

The slim bar at the top of the marketing page is the only place a token address appears anywhere
on the site. Until one exists it reads "Coming soon" with the copy button disabled.

Launching is one line, in `config/token.ts`:

```bash
npm run token 0xabc...123
git commit -am "Publish the token address" && git push
```

That is the whole change. The bar switches to the address, the copy button turns on and the
address links through to the explorer. Liveness is derived from the address rather than kept as a
separate flag, so there is no second switch to forget under pressure, and `npm run token clear`
puts it back.

Two things worth knowing:

- A malformed address **fails the build** rather than reaching the site. Better to lose fifteen
  seconds than to publish something people will paste into a wallet.
- `NEXT_PUBLIC_TOKEN_ADDRESS` still overrides the file if it is set on Vercel, for the case where
  the address has to go live without a push.

One piece of copy goes stale the moment a token exists: the "Is there a token?" answer in
`docs/reference/faq.md`, which currently says none has launched. `npm run token` prints that
reminder.

---

## The app

`/app` connects a wallet, checks a token and spender pair, signs one free EIP 2612 permit,
schedules the expiry with a bounty, lists and cancels schedules, and lets anyone execute the ones
that are due.

```
lib/chain.ts        chain definition and the read only client
lib/abi.ts          hand written ABIs, so there is no build time link to the contracts repo
lib/dort.ts         domain resolution, token inspection, bounty sizing, job reads
lib/useWallet.ts    connection, chain switching, error translation
components/app/     ScheduleForm, JobList, Dapp
```

### Two ways in, both EIP 1193

A browser wallet such as MetaMask or Rabby, and WalletConnect for mobile. Both are handed to the
same code path, so nothing downstream cares which is in use.

WalletConnect needs a project id set as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Without one its
button is hidden rather than shown and broken, because WalletConnect's own servers reject a
session with no id.

Its library is a few hundred kilobytes, so it sits behind a dynamic import and never reaches the
initial bundle. Opening `/app` loads 781 kB of chunks; the WalletConnect chunks are a further
1.2 MB that only arrive if someone clicks that button.

### The EIP 712 domain is resolved, never guessed

A token signs under a domain built from its name, version, chain id and address. Getting `name`
or `version` wrong produces a signature the token will never accept, and the job would sit on
chain until its owner cancels it, with the bounty stuck in the meantime.

`resolvePermitDomain` tries the plausible candidates and checks each against the token's own
`DOMAIN_SEPARATOR()`. Nothing is scheduled unless one reproduces it exactly.

### Two audit findings are handled here

Neither can be fixed in an immutable contract, so the front end carries them:

1. **`permitDeadline` is always set far beyond `expiresAt`**, ten years by default. The registry
   only requires `permitDeadline >= expiresAt`, but a permit is rejected once
   `block.timestamp > deadline`, so setting them equal would leave a one second window in which
   the job could run. Finding M-02.
2. **A bounty below the cost of running the job is flagged.** Keepers rationally ignore those, so
   the approval would never expire while the user believed they were protected. The threshold
   comes from a measured 98,274 gas for `execute`, priced at the live gas price. Finding M-06.

### Verification

```bash
node scripts/read-path-check.mjs
```

Checks the read path against live mainnet: `nextJobId`, the `ScheduleCreated` log filter,
Multicall3 and the gas price.

```bash
anvil --fork-url https://rpc.mainnet.chain.robinhood.com --chain-id 4663 --port 8546
```

```bash
node scripts/verify-frontend-flow.mjs http://127.0.0.1:8546 <test-token>
```

Runs the whole flow against a fork, using the genuinely deployed registry and lens: resolve the
domain, sign, simulate, schedule, warp, execute, confirm the allowance reached zero. This is
where the 98,274 gas figure comes from.

It cannot drive a browser wallet, which is the one gap. Everything under the wallet is covered.

---

## Layout

```
app/
  layout.tsx      fonts, metadata, Open Graph tags
  page.tsx        the marketing page
  globals.css     the design system
  app/page.tsx    the app route
  dapp.css        app styles, built from the same tokens
components/
  ContractAddressBar.tsx   the bar above the navigation
  Nav.tsx                  navigation, morphs to a pill on scroll
  Hero.tsx                 scroll driven sticky hero
  Mechanism.tsx            the four diagrams inside the hero frame
  Visuals.tsx              the informative section visuals
  MetricStrip.tsx          bold coloured figures
  Reveal.tsx               intersection reveal
  Progress.tsx             scroll progress bar
  CountUp.tsx              figure counter
  Faq.tsx                  accordion
  app/                     the dApp
config/
  contracts.ts    the only place addresses live
lib/              chain, ABIs, protocol reads, wallet
scripts/          verification scripts, not part of the build
_reference/       the reference frontend and the design audit taken from it
```

`_reference/` is kept for provenance and is excluded from the build. See
[`_reference/DESIGN_NOTES.md`](_reference/DESIGN_NOTES.md) for the palette, type, spacing and
motion audit this site was built from, and the record of which accent hues were replaced.

---

## Deploying

Vercel detects Next.js and needs no extra configuration. There is no `vercel.json`, because
static export is first class on the platform.

Build command `npm run build`, output directory `out`.

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the project settings before the first deploy, or
mobile wallets will not be offered.
