# DORT Web

Marketing site for DORT, a security protocol that gives every ERC 20 token
approval a self chosen expiry date, built for Robinhood Chain.

Static site. Next.js App Router with `output: "export"`. No wallet connection,
no blockchain calls and no Solidity live in this repository.

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

## Filling in contract addresses

Every contract, network and token value on the site comes from one file:
[`config/contracts.ts`](config/contracts.ts). No component holds a literal
address of its own.

Each field reads an optional `NEXT_PUBLIC_` environment variable and falls back
to an empty string. There are therefore two ways to fill values in, and both
work without touching any component:

**On Vercel (recommended).** Add the variables from
[`.env.example`](.env.example) in the project settings, then redeploy. No code
change is needed. Every variable is prefixed `NEXT_PUBLIC_` because all of these
values are public by nature.

**In the repository.** Edit the defaults in `config/contracts.ts` directly.

### Publishing the contract address

The site carries no token narrative anywhere. The only place a token contract
address appears is the slim bar at the very top of the page, and it reads
`TOKEN.isLive` and `TOKEN.contractAddress`. It shows "Coming soon" with a
disabled copy button until **both** of these are true:

- `NEXT_PUBLIC_TOKEN_IS_LIVE` is the exact string `true`
- `NEXT_PUBLIC_TOKEN_ADDRESS` holds a non empty address

Set both and redeploy. The bar then shows the full address in monospace with a
working copy button, and the anticipation shimmer turns itself off. Nothing
else on the site needs editing, and no copy anywhere will contradict the flag.

---

## Layout

```
app/
  layout.tsx      fonts, metadata, Open Graph tags
  page.tsx        every section, in the order set by the brief
  globals.css     the whole design system
components/
  ContractAddressBar.tsx   the bar above the navigation
  Nav.tsx                  navigation, morphs to a pill on scroll
  Hero.tsx                 scroll driven sticky hero
  Mechanism.tsx            the four diagrams inside the hero frame
  Reveal.tsx               intersection reveal
  Progress.tsx             scroll progress bar
  CountUp.tsx              figure counter
  Faq.tsx                  accordion
config/
  contracts.ts    the only place addresses live
_reference/       the reference frontend and the design audit taken from it
```

`_reference/` is kept for provenance and is excluded from the build. See
[`_reference/DESIGN_NOTES.md`](_reference/DESIGN_NOTES.md) for the palette,
type, spacing and motion audit that this site was built from.

---

## Deploying

Vercel detects Next.js and needs no extra configuration. There is no
`vercel.json`, because static export is first class on the platform.

Build command `npm run build`, output directory `out`.
