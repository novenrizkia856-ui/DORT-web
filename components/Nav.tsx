"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#different", label: "Why DORT" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
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
          <a className="brand" href="#top" aria-label="DORT home">
            <span className="wm">DORT</span>
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
