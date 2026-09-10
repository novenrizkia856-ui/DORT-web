/**
 * Packages docs/ for GitBook.
 *
 * The markdown under docs/ is the single source: the website renders it at build time, and this
 * zips the same files with the SUMMARY.md GitBook needs for its table of contents. Because the
 * structure comes from lib/docs-nav.ts in both cases, the site and the handbook cannot drift.
 *
 * Usage: node scripts/build-gitbook.mjs [outputDir]
 * Default output: D:/project-work/dort-docs.zip
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const OUT_DIR = process.argv[2] ?? path.resolve(ROOT, "..");
const STAGE = path.join(ROOT, ".gitbook-stage");
const ZIP = path.join(OUT_DIR, "dort-docs.zip");

/* The nav is TypeScript, so read and parse it rather than importing it. Keeping one definition
   matters more than the small amount of parsing here. */
function readNav() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "docs-nav.ts"), "utf8");
  const body = src.slice(src.indexOf("export const NAV"), src.indexOf("/** Flat, in reading order"));

  const sections = [];
  let current = null;

  for (const line of body.split("\n")) {
    const sectionTitle = line.match(/^\s{4}title:\s*"([^"]+)"/);
    if (sectionTitle) {
      current = { title: sectionTitle[1], items: [] };
      sections.push(current);
      continue;
    }
    const item = line.match(/\{\s*slug:\s*"([^"]*)",\s*title:\s*"([^"]+)"/);
    if (item && current) current.items.push({ slug: item[1], title: item[2] });
  }
  return sections;
}

function buildSummary(nav) {
  const lines = ["# Table of contents", ""];

  // GitBook wants the landing page first and unnested.
  const intro = nav[0];
  const first = intro.items[0];
  lines.push(`* [${first.title}](README.md)`);
  for (const item of intro.items.slice(1)) {
    lines.push(`* [${item.title}](${item.slug}.md)`);
  }
  lines.push("");

  for (const section of nav.slice(1)) {
    lines.push(`## ${section.title}`, "");
    for (const item of section.items) {
      lines.push(`* [${item.title}](${item.slug}.md)`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
}

/* -------------------------------------------------------------------------- */

const nav = readNav();
const expected = nav.reduce((n, s) => n + s.items.length, 0);
console.log(`  nav: ${nav.length} sections, ${expected} pages`);

// Every page in the nav must have a file, or GitBook will show an empty entry.
const missing = nav
  .flatMap((s) => s.items)
  .map((i) => (i.slug === "" ? "README.md" : `${i.slug}.md`))
  .filter((rel) => !fs.existsSync(path.join(DOCS, rel)));

if (missing.length > 0) {
  console.error(`  missing markdown for: ${missing.join(", ")}`);
  process.exit(1);
}

fs.rmSync(STAGE, { recursive: true, force: true });
copyTree(DOCS, STAGE);

const summary = buildSummary(nav);
fs.writeFileSync(path.join(STAGE, "SUMMARY.md"), summary + "\n", "utf8");

// .gitbook.yaml tells GitBook where the root and the summary live.
fs.writeFileSync(
  path.join(STAGE, ".gitbook.yaml"),
  ["root: ./", "", "structure:", "  readme: README.md", "  summary: SUMMARY.md", ""].join("\n"),
  "utf8"
);

const fileCount = countFiles(STAGE);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(ZIP, { force: true });

// PowerShell's Compress-Archive is always present on Windows, so no zip dependency is needed.
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${STAGE}\\*' -DestinationPath '${ZIP}' -Force`,
  ],
  { stdio: "inherit" }
);

fs.rmSync(STAGE, { recursive: true, force: true });

const size = fs.statSync(ZIP).size;
console.log(`  wrote ${ZIP}`);
console.log(`  ${fileCount} files, ${(size / 1024).toFixed(1)} kB`);
