"use client";

import { useEffect, useState } from "react";
import { useInView } from "./useInView";

export type Metric = {
  /** The figure itself. A number counts up, a string is set as written. */
  value: number | string;
  /** Small mono label above the figure. */
  kicker: string;
  /** One short line under the figure. */
  label: string;
  /** Optional unit set beside the figure. */
  unit?: string;
};

/**
 * A row of large, bold, coloured figures. Numbers count up when the strip
 * first enters the viewport; words simply rise into place.
 */
export default function MetricStrip({
  items,
  tone = "accent",
}: {
  items: Metric[];
  tone?: "accent" | "signal" | "risk";
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);

  return (
    <div className={`mstrip tone-${tone}`} ref={ref}>
      {items.map((m, i) => (
        <div className="mitem" key={m.kicker} style={{ animationDelay: `${i * 90}ms` }}>
          <div className="mk">{m.kicker}</div>
          <div className="mv">
            {typeof m.value === "number" ? <Tick to={m.value} run={seen} /> : m.value}
            {/* The explicit space keeps "0 gas" from being read as one word. */}
            {m.unit && <>{" "}<span className="mu">{m.unit}</span></>}
          </div>
          <p className="ml">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Counts to `to` once `run` flips true, on the shared easing curve. */
function Tick({ to, run, duration = 1300 }: { to: number; run: boolean; duration?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (to === 0) {
      setN(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [run, to, duration]);

  return <>{n.toLocaleString("en-US")}</>;
}
