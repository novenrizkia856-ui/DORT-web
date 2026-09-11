/**
 * Generates the web brand assets from the masters in brand/source/.
 *
 * The artwork arrives as 4167px squares with 19 to 34 percent empty margin baked in, which is
 * right for print and wrong for a 24px navigation bar. Everything here trims to the real content
 * box first, so a logo placed at a given height actually occupies that height.
 *
 * Run: node scripts/brand-assets.mjs
 */

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "brand", "source");
const OUT = path.join(ROOT, "public", "brand");
const APP = path.join(ROOT, "app");

/** Sampled from the supplied artwork, not guessed. */
export const BRAND = { green: "#29d394", ink: "#070a07" };

fs.mkdirSync(OUT, { recursive: true });

/** Finds the bounding box of everything that is not fully transparent. */
async function contentBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] < 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const trimmed = new Map();
async function trim(name) {
  if (!trimmed.has(name)) {
    const file = path.join(SRC, `${name}.png`);
    const box = await contentBox(file);
    trimmed.set(name, { buf: await sharp(file).extract(box).png().toBuffer(), box });
  }
  return trimmed.get(name);
}

async function emit(name, buffer, label) {
  await fs.promises.writeFile(name, buffer);
  const { width, height } = await sharp(buffer).metadata();
  const kb = (buffer.length / 1024).toFixed(1);
  const rel = path.relative(ROOT, name).split(path.sep).join("/");
  console.log(`  ${rel.padEnd(30)} ${`${width}x${height}`.padEnd(10)} ${kb.padStart(6)} kB  ${label}`);
}

/* ---- lockups, for the navigation bar, the footer and the two app headers ---- */

async function lockup(source, out, width, label) {
  const { buf } = await trim(source);
  const png = await sharp(buf).resize({ width, fit: "inside" }).png({ compressionLevel: 9, palette: true }).toBuffer();
  await emit(path.join(OUT, out), png, label);
}

/* ---- icons: the mark centred on the brand's own near black ---- */

async function icon(out, size, radius, label) {
  const { buf } = await trim("mark-green");
  const inner = Math.round(size * 0.58);
  const mark = await sharp(buf).resize({ height: inner, fit: "inside" }).toBuffer();
  const { width: mw, height: mh } = await sharp(mark).metadata();

  let canvas = sharp({
    create: { width: size, height: size, channels: 4, background: BRAND.ink },
  }).composite([{ input: mark, left: Math.round((size - mw) / 2), top: Math.round((size - mh) / 2) }]);

  if (radius > 0) {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
    );
    canvas = sharp(await canvas.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]);
  }
  await emit(out, await canvas.png({ compressionLevel: 9 }).toBuffer(), label);
}

/* ---- the social card, the one asset the set did not include ---- */

async function ogCard() {
  const W = 1200, H = 630;
  const { buf } = await trim("lockup-onDark");
  const lock = await sharp(buf).resize({ width: 560, fit: "inside" }).toBuffer();
  const { width: lw, height: lh } = await sharp(lock).metadata();

  const tagline = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="${W / 2}" y="${H / 2 + lh / 2 + 74}" text-anchor="middle"
          font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="27" fill="#8c9a92">
      Every token approval gets an end date you choose.
    </text>
    <rect x="${W / 2 - 26}" y="${H / 2 + lh / 2 + 28}" width="52" height="2" fill="${BRAND.green}"/>
  </svg>`);

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: BRAND.ink } })
    .composite([
      { input: lock, left: Math.round((W - lw) / 2), top: Math.round(H / 2 - lh / 2 - 34) },
      { input: tagline, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await emit(path.join(OUT, "og.png"), png, "social card, 1.91:1");
}

/* -------------------------------------------------------------------------- */

console.log("brand assets");
await lockup("lockup-ink", "lockup-ink.png", 480, "green mark, ink wordmark, for light surfaces");
await lockup("lockup-onDark", "lockup-on-dark.png", 480, "green mark, white wordmark, for the scrolled nav");
await lockup("mark-green", "mark.png", 256, "mark alone");
await icon(path.join(APP, "icon.png"), 96, 21, "browser tab");
await icon(path.join(APP, "apple-icon.png"), 180, 0, "home screen, iOS rounds it itself");
await ogCard();
