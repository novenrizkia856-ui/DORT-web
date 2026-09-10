/**
 * The one place the documentation structure is defined.
 *
 * It drives three things that must never disagree: the sidebar on the website, the previous and
 * next links at the foot of each page, and the SUMMARY.md that GitBook reads. Adding a page means
 * adding a markdown file under docs/ and a line here.
 */

export type DocItem = { slug: string; title: string; blurb?: string };
export type DocSection = { title: string; items: DocItem[] };

export const NAV: DocSection[] = [
  {
    title: "Introduction",
    items: [
      { slug: "", title: "What DORT is", blurb: "The problem, and the shape of the answer." },
      { slug: "how-it-works", title: "How it works", blurb: "The five steps, end to end." },
      { slug: "quickstart", title: "Quickstart", blurb: "Protect your first approval." },
    ],
  },
  {
    title: "Protocol",
    items: [
      { slug: "protocol/architecture", title: "Architecture", blurb: "Two contracts, no server." },
      { slug: "protocol/lifecycle", title: "Job lifecycle", blurb: "Every state a job can reach." },
      { slug: "protocol/permit", title: "The permit signature", blurb: "What you sign, and why." },
      { slug: "protocol/keepers", title: "Keepers and bounties", blurb: "Who runs the jobs." },
      { slug: "protocol/security", title: "Security model", blurb: "What you are trusting." },
      { slug: "protocol/limitations", title: "Limitations", blurb: "What DORT does not do." },
    ],
  },
  {
    title: "Contracts",
    items: [
      { slug: "contracts/registry", title: "DORTRegistry", blurb: "The protocol itself." },
      { slug: "contracts/lens", title: "DORTLens", blurb: "The read only helper." },
      { slug: "contracts/deployments", title: "Deployments", blurb: "Addresses and networks." },
    ],
  },
  {
    title: "Guides",
    items: [
      { slug: "guides/schedule", title: "Schedule an expiry", blurb: "In code, start to finish." },
      { slug: "guides/keeper", title: "Run a keeper", blurb: "Earn bounties, keep the network honest." },
      { slug: "guides/integrate", title: "Integrate DORT", blurb: "Offer expiries inside your own app." },
    ],
  },
  {
    title: "Reference",
    items: [
      { slug: "reference/audit", title: "Audit summary", blurb: "Findings, and what was done." },
      { slug: "reference/faq", title: "FAQ", blurb: "Short answers." },
    ],
  },
];

/** Flat, in reading order. Used for the previous and next links. */
export const FLAT: DocItem[] = NAV.flatMap((s) => s.items);

export function findItem(slug: string): DocItem | undefined {
  return FLAT.find((i) => i.slug === slug);
}

export function neighbours(slug: string): { prev?: DocItem; next?: DocItem } {
  const i = FLAT.findIndex((x) => x.slug === slug);
  if (i === -1) return {};
  return { prev: FLAT[i - 1], next: FLAT[i + 1] };
}

/** Section a slug belongs to, for the sidebar and the breadcrumb. */
export function sectionOf(slug: string): string | undefined {
  return NAV.find((s) => s.items.some((i) => i.slug === slug))?.title;
}

export const docHref = (slug: string) => (slug === "" ? "/docs" : `/docs/${slug}`);
