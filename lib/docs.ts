import fs from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";
import { createHighlighter, type Highlighter } from "shiki";

/**
 * Reads the markdown under docs/ and renders it to HTML at build time.
 *
 * Everything here runs during `next build` and nothing ships to the browser: no markdown parser,
 * no highlighter, no runtime fetch. The same files are zipped for GitBook, so the site and the
 * handbook can never drift apart.
 */

const DOCS_DIR = path.join(process.cwd(), "docs");

export type Heading = { id: string; text: string; level: number };
export type RenderedDoc = { html: string; headings: Heading[]; title: string };

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-light"],
      langs: ["solidity", "typescript", "javascript", "bash", "json", "text"],
    });
  }
  return highlighter;
}

/** Turns heading text into a stable anchor id. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function docPath(slug: string): string {
  return path.join(DOCS_DIR, slug === "" ? "README.md" : `${slug}.md`);
}

export function docExists(slug: string): boolean {
  return fs.existsSync(docPath(slug));
}

export function readDoc(slug: string): string {
  return fs.readFileSync(docPath(slug), "utf8");
}

/**
 * Rewrites a relative markdown link into a site URL.
 *
 * The same files are published to GitBook, where `../reference/audit.md` is exactly right. On the
 * site it has to become `/docs/reference/audit`, resolved against the directory of the page doing
 * the linking. Anything absolute or external is left alone.
 */
function resolveDocLink(href: string, fromSlug: string): string {
  if (/^(https?:|mailto:|#|\/)/.test(href)) return href;
  if (!href.includes(".md")) return href;

  const [pathPart, hash] = href.split("#");
  const fromDir = fromSlug.includes("/") ? fromSlug.slice(0, fromSlug.lastIndexOf("/")) : "";

  const segments = (fromDir ? fromDir.split("/") : []).concat(pathPart.split("/"));
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }

  let target = stack.join("/").replace(/\.md$/, "");
  if (target === "README") target = "";

  const base = target === "" ? "/docs" : `/docs/${target}`;
  return hash ? `${base}#${hash}` : base;
}

export async function renderDoc(slug: string): Promise<RenderedDoc> {
  const source = readDoc(slug);
  const hl = await getHighlighter();
  const headings: Heading[] = [];

  const marked = new Marked();

  // The outer parse runs with `async: true` so code fences can be highlighted inside walkTokens.
  // In that mode `parseInline` also returns a Promise, so a separate synchronous instance is used
  // for inline fragments inside custom renderers. Without it every heading, cell and link renders
  // as the string "[object Promise]".
  const inlineMarked = new Marked();
  const inline = (text: string) => inlineMarked.parseInline(text) as string;

  // Code fences are highlighted during the async walk, then handed straight back by the renderer.
  const highlighted = new Map<string, string>();

  marked.use({
    async: true,
    async walkTokens(token) {
      if (token.type !== "code") return;
      const t = token as Tokens.Code;
      const lang = normaliseLang(t.lang);
      try {
        highlighted.set(
          keyFor(t.text, t.lang),
          hl.codeToHtml(t.text, { lang, theme: "github-light" })
        );
      } catch {
        /* An unknown language falls through to the plain renderer below. */
      }
    },
    renderer: {
      code(token: Tokens.Code) {
        const pre = highlighted.get(keyFor(token.text, token.lang));
        const label = token.lang ? `<span class="code-lang">${escapeHtml(token.lang)}</span>` : "";
        const body = pre ?? `<pre><code>${escapeHtml(token.text)}</code></pre>`;
        return `<div class="codeblock">${label}${body}</div>`;
      },
      heading(token: Tokens.Heading) {
        const text = stripInline(token.text);
        const id = slugify(text);
        if (token.depth === 2 || token.depth === 3) {
          headings.push({ id, text, level: token.depth });
        }
        const inner = inline(token.text);
        return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">${inner}</a></h${token.depth}>`;
      },
      table(token: Tokens.Table) {
        // Wrapped so a wide table scrolls inside itself rather than the page.
        const head = token.header
          .map((c) => `<th>${inline(c.text)}</th>`)
          .join("");
        const body = token.rows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${inline(c.text)}</td>`).join("")}</tr>`
          )
          .join("");
        return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      },
      link(token: Tokens.Link) {
        const href = resolveDocLink(token.href, slug);
        const external = /^https?:/.test(href);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        const text = inline(token.text);
        return `<a href="${href}"${attrs}>${text}</a>`;
      },
      blockquote(token: Tokens.Blockquote) {
        const inner = marked.parser(token.tokens) as string;
        return `<blockquote class="callout">${inner}</blockquote>`;
      },
    },
  });

  const html = (await marked.parse(source)) as string;

  // The first h1 is the page title, and is rendered by the layout rather than the body.
  const titleMatch = source.match(/^#\s+(.+)$/m);
  const title = titleMatch ? stripInline(titleMatch[1]) : slug;

  return { html: stripFirstH1(html), headings, title };
}

const keyFor = (text: string, lang?: string) => `${lang ?? ""}::${text}`;

function normaliseLang(lang?: string): string {
  const l = (lang ?? "").toLowerCase();
  if (l === "sol") return "solidity";
  if (l === "ts" || l === "tsx") return "typescript";
  if (l === "js" || l === "mjs") return "javascript";
  if (l === "sh" || l === "shell") return "bash";
  const known = ["solidity", "typescript", "javascript", "bash", "json"];
  return known.includes(l) ? l : "text";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Removes markdown emphasis and code ticks so a heading id and TOC entry read cleanly. */
function stripInline(s: string): string {
  return s.replace(/`/g, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function stripFirstH1(html: string): string {
  return html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, "");
}
