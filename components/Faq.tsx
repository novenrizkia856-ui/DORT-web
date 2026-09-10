"use client";

import { useEffect, useRef, useState } from "react";

const ITEMS = [
  {
    q: "What is a token approval?",
    a: "It is permission for an app to move a token on your behalf. Most apps ask for it before a swap or a deposit. The permission normally has no limit and no end.",
  },
  {
    q: "Why does an expiry date matter?",
    a: "An approval you forgot about is still live. If that app is ever compromised, the old permission is the way in. An expiry closes that window on a schedule you set yourself.",
  },
  {
    q: "Which chain does this run on?",
    a: "Robinhood Chain. It is an EVM Layer 2 built on Arbitrum Orbit that settles to Ethereum. Gas is paid in ETH.",
  },
  {
    q: "Does the protocol hold my funds?",
    a: "No. The registry records when an approval should end and executes that. It never takes custody of your tokens at any point.",
  },
  {
    q: "Has the contract been audited?",
    a: "Not by an independent firm, not yet. It went through an internal review with full test coverage, randomised invariant testing and a live security drill. The code is immutable, so what is on chain is exactly what was reviewed. Judge it on that basis.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="faq">
      {ITEMS.map((it, i) => (
        <Item key={it.q} {...it} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
      ))}
    </div>
  );
}

function Item({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  /* Measure the answer so the panel can animate to a real height. Re-measured
     on toggle, on resize, and once the webfonts have settled, since the text
     reflows when Newsreader and the body face finish loading. */
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => setH(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  return (
    <div className={`fitem${open ? " open" : ""}`}>
      <button type="button" className="fq" onClick={onToggle} aria-expanded={open}>
        {q}
        <span className="fq-ic" aria-hidden="true" />
      </button>
      <div className="fa" style={{ height: open ? h : 0 }} aria-hidden={!open}>
        <div className="fa-in" ref={body}>
          {a}
        </div>
      </div>
    </div>
  );
}
