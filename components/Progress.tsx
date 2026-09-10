"use client";

import { useEffect, useState } from "react";

/** The 2px accent scroll progress bar pinned to the top of the viewport. */
export default function Progress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      setPct(travel > 0 ? Math.min(100, (window.scrollY / travel) * 100) : 0);
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
  }, []);

  return <div id="prog" style={{ width: `${pct}%` }} aria-hidden="true" />;
}
