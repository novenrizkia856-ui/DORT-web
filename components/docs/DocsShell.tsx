"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, docHref } from "@/lib/docs-nav";

/** Left sidebar plus the mobile drawer that replaces it under 1000px. */
export function DocsSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A navigation should never leave the drawer covering the page it just opened.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // next.config sets trailingSlash, so the live pathname is "/docs/x/" while docHref builds
  // "/docs/x". Compare them with the slash stripped or nothing is ever marked current.
  const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const isCurrent = (slug: string) => trim(pathname) === trim(docHref(slug));

  return (
    <>
      <button
        className="docs-menu"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="docs-nav"
      >
        <span className="docs-menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Documentation menu
      </button>

      <nav id="docs-nav" className={`docs-side${open ? " open" : ""}`} aria-label="Documentation">
        {NAV.map((section) => (
          <div className="docs-sec" key={section.title}>
            <div className="docs-sec-h">{section.title}</div>
            <ul>
              {section.items.map((item) => (
                <li key={item.slug || "index"}>
                  <Link
                    href={docHref(item.slug)}
                    className={`docs-link${isCurrent(item.slug) ? " on" : ""}`}
                    aria-current={isCurrent(item.slug) ? "page" : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

/** Right hand contents, with the current section highlighted as you scroll. */
export function DocsToc({ headings }: { headings: { id: string; text: string; level: number }[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // The topmost heading currently in the upper band of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="docs-toc" aria-label="On this page">
      <div className="docs-toc-h">On this page</div>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "sub" : undefined}>
            <a href={`#${h.id}`} className={active === h.id ? "on" : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
