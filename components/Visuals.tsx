"use client";

import { useInView } from "./useInView";

/**
 * One informative visual per section. Each explains the section's point rather
 * than decorating it, and holds its entrance until it is scrolled into view.
 * Stroke weights, mono labels and the keyframes follow the reference system.
 */

const MONO = "var(--font-plexmono), ui-monospace, monospace";
const SERIF = "var(--font-newsreader), Georgia, serif";

const FAINT = "#98a0a8";
const LINE = "#d3d3cb";
const RULE = "#e4e4de";
const ACCENT = "#1a5c93";
const SIGNAL = "#a06a1e";
const RISK = "#b53724";

const draw = (on: boolean, delay: number, dur = 1.8) =>
  on ? { animation: `drawPath ${dur}s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both` } : { opacity: 0 };
const fade = (on: boolean, delay: number) =>
  on ? { animation: `fadeIn 0.7s ease ${delay}s 1 normal both` } : { opacity: 0 };
const chip = (on: boolean, delay: number) =>
  on ? { animation: `chipIn 1.9s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both` } : { opacity: 0 };
const grow = (on: boolean, delay: number, dur = 1.6) =>
  on
    ? {
        animation: `barGrow ${dur}s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both`,
        transformOrigin: "left center",
      }
    : { transform: "scaleX(0)", transformOrigin: "left center" };

/* ---------------------------------------------------------------- Problem --
   An approval you granted keeps running. The exposure bar never stops.        */

export function ExposureBar() {
  const [ref, on] = useInView<HTMLDivElement>(0.35);
  const ticks: [number, string][] = [
    [70, "the day you approved"],
    [252, "1 year"],
    [372, "3 years"],
    [480, "today"],
  ];

  return (
    <div className="vis" ref={ref}>
      <svg viewBox="0 0 560 168" role="img" aria-label="An approval stays live indefinitely after it is granted">
        <text x="60" y="30" fontFamily={MONO} fontSize="10.5" fill={FAINT} letterSpacing=".12em">
          YOUR EXPOSURE, FROM THE DAY YOU APPROVED
        </text>

        <rect x="60" y="52" width="440" height="26" fill="#f3f0ee" />
        <g style={grow(on, 0.15)}>
          <rect x="60" y="52" width="440" height="26" fill="rgba(181,55,36,.22)" />
        </g>
        <line x1="60" y1="52" x2="60" y2="78" stroke={RISK} strokeWidth="3" style={fade(on, 0.1)} />

        <g style={fade(on, 1.1)}>
          <line
            x1="500"
            y1="65"
            x2="540"
            y2="65"
            stroke={RISK}
            strokeWidth="2.4"
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
          <path d="M540 60 L548 65 L540 70" fill="none" stroke={RISK} strokeWidth="2.4" strokeLinecap="round" />
        </g>

        <line x1="60" y1="96" x2="500" y2="96" stroke={RULE} />
        {ticks.map(([x, label], i) => (
          <g key={label} style={fade(on, 0.4 + i * 0.12)}>
            <line x1={x} y1="96" x2={x} y2="103" stroke={LINE} />
            <text
              x={x}
              y="120"
              fontFamily={MONO}
              fontSize="9.5"
              fill={FAINT}
              textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
            >
              {label}
            </text>
          </g>
        ))}

        <g style={chip(on, 0.9)}>
          <rect x="378" y="132" width="122" height="26" fill="#fbe9e4" />
          <text x="439" y="150" fontFamily={MONO} fontSize="11" fill={RISK} textAnchor="middle">
            still live
          </text>
        </g>
        <text x="60" y="150" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
          nothing ever takes it back
        </text>
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------- How It Works --
   The allowance you granted drops to zero at the moment you picked.           */

export function ExpiryChart() {
  const [ref, on] = useInView<HTMLDivElement>(0.3);

  return (
    <div className="vis" ref={ref}>
      <svg viewBox="0 0 560 210" role="img" aria-label="The allowance falls to zero at the chosen moment">
        <text x="60" y="26" fontFamily={MONO} fontSize="10.5" fill={FAINT} letterSpacing=".12em">
          ALLOWANCE OVER TIME
        </text>

        <line x1="60" y1="44" x2="60" y2="160" stroke={LINE} />
        <line x1="60" y1="160" x2="524" y2="160" stroke={LINE} />
        <line x1="60" y1="146" x2="524" y2="146" stroke={FAINT} strokeDasharray="2 5" />

        <polygon points="64,66 330,66 330,146 64,146" fill="rgba(160,106,30,.13)" style={fade(on, 0.15)} />
        <line x1="330" y1="44" x2="330" y2="160" stroke={SIGNAL} strokeDasharray="4 4" style={fade(on, 0.2)} />
        <polyline
          points="64,66 330,66 330,146 520,146"
          fill="none"
          stroke={SIGNAL}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="640"
          style={draw(on, 0.15)}
        />

        <text x="70" y="58" fontFamily={MONO} fontSize="10.5" fill={SIGNAL}>
          what the app can move
        </text>
        <text x="330" y="180" fontFamily={MONO} fontSize="10.5" fill={SIGNAL} textAnchor="middle">
          the moment you chose
        </text>
        <text x="516" y="138" fontFamily={MONO} fontSize="10.5" fill={FAINT} textAnchor="end">
          zero from here
        </text>
        <text x="64" y="180" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
          time →
        </text>

        <g style={chip(on, 0.8)}>
          <rect x="356" y="52" width="166" height="28" fill="#e3edf6" />
          <text x="439" y="71" fontFamily={MONO} fontSize="11" fill={ACCENT} textAnchor="middle">
            no action from you
          </text>
        </g>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------- Why DORT --
   What each approach asks you to keep doing, drawn to scale.                  */

export function RememberCompare() {
  const [ref, on] = useInView<HTMLDivElement>(0.3);

  return (
    <div className="vis" ref={ref}>
      <svg viewBox="0 0 560 190" role="img" aria-label="What each approach asks you to keep doing">
        <text x="60" y="26" fontFamily={MONO} fontSize="10.5" fill={FAINT} letterSpacing=".12em">
          WHAT YOU HAVE TO KEEP DOING
        </text>

        <text x="60" y="60" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
          the usual answer
        </text>
        <rect x="60" y="70" width="440" height="24" fill="#f3f0ee" />
        <g style={grow(on, 0.2)}>
          <rect x="60" y="70" width="440" height="24" fill="rgba(181,55,36,.20)" />
        </g>
        <text x="72" y="87" fontFamily={MONO} fontSize="11" fill={RISK} style={fade(on, 1.0)}>
          remember every approval, then revoke each one by hand
        </text>

        <text x="60" y="132" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
          with DORT
        </text>
        <rect x="60" y="142" width="440" height="24" fill="#f3f0ee" />
        <g style={grow(on, 0.5, 1.1)}>
          <rect x="60" y="142" width="96" height="24" fill="rgba(26,92,147,.24)" />
        </g>
        <text x="168" y="159" fontFamily={MONO} fontSize="11" fill={ACCENT} style={fade(on, 1.2)}>
          sign once, then nothing
        </text>

        <text x="516" y="87" fontFamily={SERIF} fontSize="22" fill={RISK} textAnchor="end" style={fade(on, 1.3)}>
          forever
        </text>
        <text x="516" y="159" fontFamily={SERIF} fontSize="22" fill={ACCENT} textAnchor="end" style={fade(on, 1.4)}>
          once
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------- Security --
   Every route into the deployed contract, and the fact that none exist.     */

export function TrustSurface() {
  const [ref, on] = useInView<HTMLDivElement>(0.3);
  const routes = ["owner key", "admin call", "upgrade", "custody"];

  return (
    <div className="vis" ref={ref}>
      <svg viewBox="0 0 560 220" role="img" aria-label="No route can reach into the deployed registry">
        <text x="60" y="26" fontFamily={MONO} fontSize="10.5" fill={FAINT} letterSpacing=".12em">
          WAYS IN, ONCE DEPLOYED
        </text>

        {routes.map((r, i) => {
          const y = 58 + i * 38;
          return (
            <g key={r}>
              <text x="60" y={y + 4} fontFamily={MONO} fontSize="11" fill={FAINT} style={fade(on, 0.1 + i * 0.1)}>
                {r}
              </text>
              <line
                x1="148"
                y1={y}
                x2="316"
                y2={y}
                stroke={LINE}
                strokeDasharray="4 5"
                style={fade(on, 0.15 + i * 0.1)}
              />
              {/* The route is struck through: it does not exist. */}
              <g style={draw(on, 0.5 + i * 0.12, 0.9)}>
                <line
                  x1="216"
                  y1={y - 11}
                  x2="248"
                  y2={y + 11}
                  stroke={RISK}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="640"
                />
                <line
                  x1="248"
                  y1={y - 11}
                  x2="216"
                  y2={y + 11}
                  stroke={RISK}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="640"
                />
              </g>
            </g>
          );
        })}

        <g style={fade(on, 0.35)}>
          <rect x="340" y="52" width="176" height="122" fill="#fff" stroke={ACCENT} strokeWidth="1.6" />
          <text x="428" y="102" fontFamily={MONO} fontSize="11" fill={ACCENT} textAnchor="middle">
            the registry
          </text>
          <text x="428" y="124" fontFamily={MONO} fontSize="10.5" fill={FAINT} textAnchor="middle">
            immutable
          </text>
        </g>

        <text x="60" y="204" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
          what is audited is what runs, for as long as it runs
        </text>
      </svg>
    </div>
  );
}
