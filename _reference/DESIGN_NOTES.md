# Reference Design Audit (Brief section 4.1)

Source: saved production page from `ergoyield.com` (Next.js App Router, plain CSS, no Tailwind).
Design source of truth: `_reference/assets/3-ozvmbb6l0td.css` (49 KB) plus inline styles on the hero.

## 1. Colour palette actually used

The reference runs **two layers of the same light system**.

### App layer (`:root` in the stylesheet)
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#fff` | page ground |
| `--bg-1` | `#f7f8fa` | inset panels, hover |
| `--bg-2` | `#eef1f5` | tracks, disabled |
| `--ink` | `#0a0e17` | headlines, solid buttons, scrolled nav |
| `--ink-2` | `#2b3242` | body strong |
| `--muted` | `#5b6473` | body |
| `--faint` | `#98a1b0` | labels, axis text |
| `--line` | `#e7eaf0` | hairlines |
| `--line-2` | `#d7dce5` | input borders |
| `--lend` | `#0e9e6a` | PRIMARY accent: eyebrow, progress bar, focus, selection |
| `--lend-d` | `#0b8459` | accent hover |
| `--lend-soft` | `#e3f5ec` | accent wash |
| `--opt` | `#c77e1a` | amber, warn/premium |
| `--opt-soft` | `#faf0dc` | amber wash |
| `--lp` | `#7a45e8` | violet, hero mechanism + feature section |
| `--lp-d` | `#6733d2` | violet hover |
| `--lp-soft` | `#f0e9fd` | violet wash |
| `--borrow` | `#2f6be0` | blue, secondary data |
| `--borrow-soft` | `#e8f0fd` | blue wash |
| `--neg` | `#d6472b` | negative / risk |

### Editorial layer (hero + gate, warmer, inline)
`#FAFAF8` ground, `#EDEDE7` 64px grid, `#0B0F14` ink, `#5C6670` muted, `#98A0A8` faint,
`#D3D3CB` line, `#E4E4DE` line soft, `#0B7A55` deep green, `#7A45E8` violet, `#D6472B` negative.

Shadows: `--sh-sm 0 8px 24px -14px #0a0e1729`, `--sh-md 0 22px 60px -30px #0a0e174d`,
hero frame `0 46px 92px -38px rgba(11,15,20,.35)`.

## 2. Typefaces

| Family | Weights | Used for |
|---|---|---|
| Newsreader (serif) | 200 to 800, used at 300/400 | hero H1, big editorial numerals |
| Archivo (grotesk) | 100 to 900, used at 700 | hero H1 second line, contrast word |
| IM Fell English (old style serif) | 400 | hero H1 first line only |
| IBM Plex Mono | 400 / 500 | eyebrows, labels, tickers, addresses, SVG axis text |
| System sans (`Helvetica Neue`, `Segoe UI`, system-ui) | 400 to 700 | all body and UI text |

## 3. Spacing rhythm
`section{padding:130px 0}` (84px under 600px). `.wrap{max-width:1200px;padding:0 40px}` (22px under 600px).
`.sec-head{max-width:680px;margin-bottom:60px}`. Grid gaps 22 to 24px. Card padding 38px 36px, pillar 28px 26px.
Radii: 24px cards, 20px pillars and panels, 14 to 16px inputs and small tiles, 999px pills.

## 4. Motion
No animation library. Hand written CSS keyframes plus scroll driven inline transforms.
Single easing: **`cubic-bezier(.16,.8,.24,1)`** everywhere. Secondary: plain `ease` for SVG fades, `linear` for marquees.

- `.reveal` / `.reveal.in` intersection reveal: opacity 0 to 1, `translateY(24px)` to none, 1s, staggered 0/80/160/240ms.
- Keyframes: `rise`, `riseFade`, `fadeIn`, `drawPath` (SVG stroke draw), `chipIn`, `tickUp`, `scrollcue`, `barGrow`, `gaugeSweep`, `wallUp`, `wallDown`, `rhtick`.
- Hero: `#heroWrap` is 320vh tall, `#top` is `position:sticky;height:100vh`. Scroll progress drives inline `transform` on the headline halves, on nested frame outlines, and on frame opacity.
- Nav: `.nav-in` morphs 74px full width to a 58px 980px dark pill over `.5s`.
- `#prog` 2px scroll progress bar, accent coloured.
- Hover: cards `translateY(-6px)`, pillars `translateY(-4px)`, buttons `translateY(-1px)`, all with shadow lift.
- `@media (prefers-reduced-motion:reduce)` disables reveals, marquees and hero motion.

## 5. Textures
Flat and paper like, not glassy. 64px hairline grid on the hero ground. Nested 1px outline rectangles
behind the hero frame at low opacity. Long soft shadows. A radial wash over the hero card wall.
Marquee tape with a `mask-image` fade at both edges. No blur, no grain, no glow, no gradients except
one `linear-gradient(180deg,#fff,var(--bg-1))` panel and the hero radial.

## 6. What is old branding (replaced) vs system (kept)

**Replaced:** the ErgoYield name and wordmark, the chevron logo SVG, the tagline "Wall Street, unwalled.",
all product concepts (Launchpad, Lend, Borrow, Options), stock and memecoin tickers and figures,
`app.ergoyield.com` and `x.com/ergoyield` links, and, on the founder's instruction, **both accent hues**
(the green and the violet) so the site does not read as a copy.

**Kept:** every neutral, both grounds, the spacing scale, the radii, the shadow depths,
the easing curve, all keyframes, the reveal system, the sticky scroll hero, the nav morph,
the progress bar, and the responsive breakpoints.

## 7. DORT's own accent pairing

Deep ink blue as the system colour, bronze as the expiry mechanism colour. Both sit on the
warm cream ground without fighting it, and neither appears in the reference.

| Token | Was (reference) | Now | Role |
|---|---|---|---|
| `--accent` | `#0e9e6a` green | `#1a5c93` | eyebrow, progress bar, focus ring, selection, security marks |
| `--accent-d` | `#0b8459` | `#12456e` | accent hover |
| `--accent-soft` | `#e3f5ec` | `#e3edf6` | accent wash |
| `--signal` | `#7a45e8` violet | `#a06a1e` | hero CTA, expiry diagrams, comparison highlights |
| `--signal-d` | `#6733d2` | `#7f5316` | signal hover |
| `--signal-soft` | `#f0e9fd` | `#f7eddc` | signal wash |
| `--premium` | `#c77e1a` amber | `#a06a1e` | contract address bar, unified with the bronze |
| `--e-accent` | `#0b7a55` green | `#17527f` | hero headline word, signature stroke |
| `--risk` | `#d6472b` | `#b53724` | deepened so it separates cleanly from the bronze |

Contrast on white, all passing WCAG AA: accent 7.01, bronze 4.59, editorial blue 7.88, risk 5.94.

## 8. Typographic weight

The reference ran a light editorial hero (Newsreader 300, IM Fell English 400). DORT runs
heavier throughout, on the founder's instruction:

- Hero line one: **Newsreader 700** (was IM Fell English 400, a face with no bold, now dropped entirely)
- Hero line two: **Archivo 800** (was 700)
- Hero lede: 500. Hero eyebrow: 500. Hero kicker: 700.
- All headings `h1` to `h4` and every `.sec-head h2`: **700** (was 600)
- Problem figures `.pstat .pv`: **Newsreader 700** (was 400), units 600, labels 500
- Eyebrow rule: 2px (was 1.5px), eyebrow text 700 (was 600)

IM Fell English is no longer loaded, which also removes one font request.
