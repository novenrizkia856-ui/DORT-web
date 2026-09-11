# Brand assets

The masters are in `source/`, exactly as the designer supplied them: 4167px squares with the
artwork centred and a wide empty margin. They are never referenced by the site directly.

`scripts/brand-assets.mjs` trims each one to its real content box and writes the web sizes. Run it
after replacing anything in `source/`:

```bash
node scripts/brand-assets.mjs
```

## Colours

| | |
|---|---|
| Green | `#29d394` |
| Ink | `#070a07` |

Both are sampled from the artwork, not eyeballed. They are also declared in `app/globals.css` as
`--brand-green` and `--brand-ink`.

Note that these are the *logo's* colours. The interface palette is a deep ink blue with bronze, and
stays that way: the green appears only inside the mark.

## What goes where

| Generated file | Used by |
|---|---|
| `public/brand/lockup-ink.png` | navigation bar at rest, footer, docs header, app header |
| `public/brand/lockup-on-dark.png` | navigation bar once it scrolls into its dark pill |
| `public/brand/mark.png` | the mark on its own, currently unused, kept for future needs |
| `app/icon.png` | browser tab |
| `app/apple-icon.png` | iOS home screen, left square because iOS rounds it itself |
| `public/brand/og.png` | the link preview card, composed here because the set had no 1.91:1 asset |

## Sizing

Every placement sets a **height** and leaves the width automatic, so the lockup keeps its ratio no
matter what. The `width` and `height` attributes on each `<img>` are the file's intrinsic size,
which is what stops the layout shifting while the image loads. Change the displayed size in CSS,
not in the markup.

## The two nav variants

The bar is transparent over the page at the top and becomes a dark pill after 40px of scroll, so
the wordmark has to flip from ink to white. Both images are in the DOM and cross fade on opacity.
Swapping `src`, or toggling `display`, makes the first flip flicker while the second file loads.
