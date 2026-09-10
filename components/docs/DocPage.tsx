import Link from "next/link";
import { DocsToc } from "./DocsShell";
import { renderDoc } from "@/lib/docs";
import { docHref, neighbours, sectionOf, findItem } from "@/lib/docs-nav";

/**
 * One documentation page: rendered markdown in the middle, contents on the right, and the
 * previous and next links underneath. Everything is produced at build time.
 */
export default async function DocPage({ slug }: { slug: string }) {
  const { html, headings, title } = await renderDoc(slug);
  const { prev, next } = neighbours(slug);
  const section = sectionOf(slug);
  const item = findItem(slug);

  return (
    <>
      <main className="docs-main">
        <article className="docs-article">
          {section && <div className="docs-crumb">{section}</div>}
          <h1>{title}</h1>
          {item?.blurb && <p className="docs-lede">{item.blurb}</p>}

          <div className="docs-md" dangerouslySetInnerHTML={{ __html: html }} />

          <nav className="docs-nextprev" aria-label="Page navigation">
            {prev ? (
              <Link className="np np-prev" href={docHref(prev.slug)}>
                <span className="np-k">Previous</span>
                <span className="np-t">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="np np-next" href={docHref(next.slug)}>
                <span className="np-k">Next</span>
                <span className="np-t">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </main>

      <DocsToc headings={headings} />
    </>
  );
}
