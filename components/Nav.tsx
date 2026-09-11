"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#different", label: "Why DORT" },
  { href: "#security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`nav${solid ? " solid" : ""}`} id="nav">
        <div className="nav-in">
          {/* Two lockups, stacked and cross faded. The bar turns into a dark pill once the
              page scrolls, so the ink wordmark has to give way to the white one. Both are in
              the DOM from the start, otherwise the swap flashes the first time it happens. */}
          <a className="brand" href="#top" aria-label="DORT home">
            <img
              className="wm wm-ink"
              src="/brand/lockup-ink.png"
              alt="DORT"
              width={480}
              height={152}
            />
            <img
              className="wm wm-light"
              src="/brand/lockup-on-dark.png"
              alt=""
              aria-hidden="true"
              width={480}
              height={152}
            />
          </a>

          <nav className="navlinks" aria-label="Sections">
            {LINKS.map((l) => (
              <a className="navlink" key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav-cta">
            <a className="btn btn-fill" href="/app">
              Open the app
            </a>
          </div>

          <button
            className={`hamburger${open ? " open" : ""}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mdrawer${open ? " open" : ""}`} id="mdrawer">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a className="btn btn-fill" href="/app" onClick={() => setOpen(false)}>
          Open the app
        </a>
      </div>
    </>
  );
}
