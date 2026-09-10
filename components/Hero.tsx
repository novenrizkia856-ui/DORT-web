"use client";

import { useEffect, useRef, useState } from "react";
import Mechanism, { MECHANISMS } from "./Mechanism";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/* The reference easing curve, sampled for scroll driven values. */
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export default function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [mech, setMech] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = wrapRef.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      setP(clamp01(-el.getBoundingClientRect().top / travel));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  /* Scroll phases. Copy clears first, the headline splits, the frame arrives. */
  const tCopy = reduced ? 0 : ease(p / 0.2);
  const tSplit = reduced ? 0 : ease((p - 0.04) / 0.44);
  const tFrame = reduced ? 1 : ease((p - 0.16) / 0.34);

  /* Mechanism index follows the back half of the scroll. */
  useEffect(() => {
    if (reduced || pinned !== null) return;
    const span = clamp01((p - 0.44) / 0.54);
    setMech(Math.min(MECHANISMS.length - 1, Math.floor(span * MECHANISMS.length)));
  }, [p, reduced, pinned]);

  const active = pinned ?? mech;

  const splitX = 30 * tSplit; // percent of the viewport, kept relative for mobile
  const splitY = 59 * tSplit;
  const scale = 1 - 0.48 * tSplit;

  return (
    <div id="heroWrap" ref={wrapRef} style={reduced ? { height: "100vh" } : undefined}>
      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />

        <div
          className="hero-ring"
          aria-hidden="true"
          style={{
            width: "min(828px, 96vw)",
            height: "min(624px, 72vh)",
            opacity: 0.14 * tFrame,
          }}
        />
        <div
          className="hero-ring"
          aria-hidden="true"
          style={{
            width: "min(764px, 90vw)",
            height: "min(576px, 67vh)",
            opacity: 0.32 * tFrame,
          }}
        />

        <div
          className="hero-frame"
          style={{
            width: "min(708px, 84vw)",
            height: "min(534px, 62vh)",
            opacity: tFrame,
            transform: `scale(${0.9 + 0.1 * tFrame})`,
          }}
        >
          <div className="hero-mech" style={{ opacity: tFrame }}>
            <Mechanism index={active} />
          </div>

          <div className="hero-mechbar" style={{ opacity: tFrame }}>
            <span>
              Mechanism {String(active + 1).padStart(2, "0")} · {MECHANISMS[active].key}
            </span>
            <span style={{ color: "var(--accent)" }}>
              {String(active + 1).padStart(2, "0")} / {String(MECHANISMS.length).padStart(2, "0")}
            </span>
          </div>

          <div className="hero-dots" style={{ opacity: tFrame }}>
            {MECHANISMS.map((m, i) => (
              <button
                key={m.key}
                type="button"
                className={`hero-dot${i === active ? " on" : ""}`}
                aria-label={`Show mechanism ${String(i + 1).padStart(2, "0")} ${m.key}`}
                onClick={() => setPinned(i)}
              />
            ))}
          </div>
        </div>

        <div className="hero-copy">
          <div className="hero-eyebrow" style={{ opacity: 1 - tCopy }}>
            Approval security for Robinhood Chain
          </div>

          <h1 className="hero-h1">
            <span
              className="hero-line a"
              style={{
                transform: `translate(${-splitX}vw, ${splitY}px) scale(${scale})`,
                opacity: 1 - 0.72 * tSplit,
              }}
            >
              <span className="hero-w1">Approvals that</span>
            </span>
            <span
              className="hero-line b"
              style={{
                transform: `translate(${splitX}vw, ${-splitY}px) scale(${scale})`,
                opacity: 1 - 0.72 * tSplit,
              }}
            >
              <span className="hero-w2">expire.</span>
            </span>
          </h1>

          <div
            style={{
              opacity: 1 - tCopy,
              display: tCopy > 0.98 ? "none" : "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <p className="hero-sub">
              Every token approval gets an end date that you choose. The permission removes itself
              when the time arrives.
            </p>

            <div className="hero-cta">
              <a href="/app" className="hero-a">
                Open the app <span aria-hidden="true">→</span>
              </a>
              <a href="#how" className="hero-b">
                See how it works
              </a>
            </div>

            <p className="hero-sub2">You set the time. The chain does the rest.</p>
          </div>
        </div>

        <div
          className="hero-note"
          style={{ top: "calc(50% + min(296px, 33vh))", opacity: 0.5 * tFrame }}
          aria-hidden={tFrame < 0.5}
        >
          <p>{MECHANISMS[active].note}</p>
        </div>

        <div className="hero-scroll" style={{ opacity: 1 - tCopy }} aria-hidden="true">
          <span className="hero-cuetrack">
            <span className="hero-cue" />
          </span>
          SCROLL
        </div>
      </section>
    </div>
  );
}
