"use client";

/**
 * The four diagrams that cycle inside the hero frame as the page is scrolled.
 * Stroke weights, the mono axis labels and the drawPath / chipIn / tickUp /
 * fadeIn keyframes follow the reference frontend. The palette is DORT's:
 * ink blue for the system, bronze for the expiry mechanism, red for risk.
 */

export const MECHANISMS = [
  { key: "APPROVE", note: "An approval you grant today has no end date. It stays live until you remove it." },
  { key: "SIGN", note: "One message names the moment the approval should stop. Signing costs nothing." },
  { key: "EXPIRE", note: "When that moment arrives the allowance is set to zero. You do nothing." },
  { key: "KEEPER", note: "Anyone can execute an expiry that is due. A small reward pays for the gas." },
] as const;

const MONO = "var(--font-plexmono), ui-monospace, monospace";
const SERIF = "var(--font-newsreader), Georgia, serif";

const INK = "#0B0F14";
const FAINT = "#98A0A8";
const LINE = "#D3D3CB";
const RULE = "#E4E4DE";
const SIGNAL = "#A06A1E";
const ACCENT = "#17527F";
const RISK = "#B53724";

const draw = (delay: number) => ({
  animation: `drawPath 1.9s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both`,
});
const fade = (delay: number) => ({ animation: `fadeIn 0.7s ease ${delay}s 1 normal both` });
const chip = (delay: number) => ({
  animation: `chipIn 2.2s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both`,
});
const tick = (delay: number) => ({
  animation: `tickUp 1.8s cubic-bezier(0.16,0.8,0.24,1) ${delay}s 1 normal both`,
});

export default function Mechanism({ index }: { index: number }) {
  const m = MECHANISMS[index] ?? MECHANISMS[0];
  return (
    <svg
      viewBox="0 0 560 420"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${m.key} mechanism`}
    >
      {/* Re-keyed so every panel replays its entrance. */}
      <g key={index}>
        <Title index={index} label={m.key} />
        {index === 0 && <Approve />}
        {index === 1 && <Sign />}
        {index === 2 && <Expire />}
        {index === 3 && <Keeper />}
      </g>
    </svg>
  );
}

function Title({ index, label }: { index: number; label: string }) {
  return (
    <g>
      <text x="40" y="52" fontFamily={MONO} fontSize="12" fill={ACCENT} letterSpacing=".14em">
        {String(index + 1).padStart(2, "0")}
      </text>
      <text x="76" y="52" fontFamily={MONO} fontSize="12" fill={FAINT} letterSpacing=".14em">
        {label}
      </text>
    </g>
  );
}

function Foot({ k, v, color }: { k: string; v: string; color: string }) {
  return (
    <g>
      <line x1="40" y1="364" x2="524" y2="364" stroke={RULE} />
      <text x="40" y="396" fontFamily={MONO} fontSize="12" fill={FAINT}>
        {k}
      </text>
      <text
        x="524"
        y="400"
        fontFamily={SERIF}
        fontSize="34"
        fill={color}
        textAnchor="end"
        style={tick(0.6)}
      >
        {v}
      </text>
    </g>
  );
}

/* 01 · The approval you grant today never ends. */
function Approve() {
  return (
    <g>
      <line x1="60" y1="110" x2="60" y2="320" stroke={LINE} />
      <line x1="60" y1="320" x2="524" y2="320" stroke={LINE} />

      <polygon points="64,196 496,196 496,300 64,300" fill="rgba(181,55,36,.10)" style={fade(0.1)} />
      <polyline
        points="64,196 470,196"
        fill="none"
        stroke={RISK}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="640"
        style={draw(0.1)}
      />
      <line
        x1="470"
        y1="196"
        x2="522"
        y2="196"
        stroke={RISK}
        strokeWidth="3"
        strokeDasharray="5 6"
        strokeLinecap="round"
        style={fade(0.9)}
      />

      <text x="70" y="186" fontFamily={MONO} fontSize="10.5" fill={RISK}>
        the allowance you granted
      </text>
      <text x="70" y="272" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
        no end date is recorded
      </text>
      <text x="64" y="342" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
        time →
      </text>

      <g style={chip(0.2)}>
        <rect x="330" y="112" width="172" height="32" fill="#FBE9E4" />
        <text
          x="416"
          y="133"
          fontFamily={MONO}
          fontSize="12.5"
          fill={RISK}
          textAnchor="middle"
        >
          still live, years later
        </text>
      </g>

      <Foot k="THIS APPROVAL ENDS" v="never" color={RISK} />
    </g>
  );
}

/* 02 · One free signature names the moment it should stop. */
function Sign() {
  const rows: [string, string][] = [
    ["token", "the one you approved"],
    ["spender", "the app you approved"],
    ["expires", "30 days from now"],
  ];
  return (
    <g>
      <g style={fade(0.1)}>
        <rect x="60" y="112" width="286" height="192" fill="#fff" stroke={LINE} />
        <line x1="60" y1="146" x2="346" y2="146" stroke={RULE} />
        <text x="74" y="135" fontFamily={MONO} fontSize="10.5" fill={FAINT} letterSpacing=".1em">
          MESSAGE TO SIGN
        </text>
        {rows.map(([k, v], i) => (
          <g key={k}>
            <text x="74" y={176 + i * 34} fontFamily={MONO} fontSize="10.5" fill={FAINT}>
              {k}
            </text>
            <text
              x="332"
              y={176 + i * 34}
              fontFamily={MONO}
              fontSize="11"
              fill={i === 2 ? SIGNAL : INK}
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}
      </g>

      {/* The signature stroke draws itself in. */}
      <path
        d="M78 274 q16 -22 30 -2 t28 -2 q14 -20 30 4 t26 -6 q16 -18 28 6"
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="640"
        style={draw(0.35)}
      />

      <line
        x1="368"
        y1="208"
        x2="452"
        y2="208"
        stroke={LINE}
        strokeDasharray="4 5"
        style={fade(0.5)}
      />
      <text x="410" y="198" fontFamily={MONO} fontSize="10.5" fill={FAINT} textAnchor="middle">
        →
      </text>

      <g style={chip(0.3)}>
        <rect x="392" y="150" width="130" height="32" fill="#E3EDF6" />
        <text x="457" y="171" fontFamily={MONO} fontSize="12.5" fill={ACCENT} textAnchor="middle">
          off chain
        </text>
      </g>
      <g style={chip(0.5)}>
        <rect x="392" y="234" width="130" height="32" fill="#F7EDDC" />
        <text x="457" y="255" fontFamily={MONO} fontSize="12.5" fill={SIGNAL} textAnchor="middle">
          nothing to pay
        </text>
      </g>

      <Foot k="COST TO SIGN" v="free" color={ACCENT} />
    </g>
  );
}

/* 03 · At the chosen moment the allowance drops to zero. */
function Expire() {
  return (
    <g>
      <line x1="60" y1="110" x2="60" y2="320" stroke={LINE} />
      <line x1="60" y1="320" x2="524" y2="320" stroke={LINE} />
      <line x1="60" y1="300" x2="524" y2="300" stroke={FAINT} strokeDasharray="2 5" />

      <polygon points="64,186 340,186 340,300 64,300" fill="rgba(160,106,30,.13)" style={fade(0.1)} />
      <line
        x1="340"
        y1="110"
        x2="340"
        y2="320"
        stroke={SIGNAL}
        strokeDasharray="4 4"
        style={fade(0.15)}
      />
      <polyline
        points="64,186 340,186 340,300 522,300"
        fill="none"
        stroke={SIGNAL}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="640"
        style={draw(0.1)}
      />

      <text x="70" y="176" fontFamily={MONO} fontSize="10.5" fill={SIGNAL}>
        the allowance you granted
      </text>
      <text x="64" y="342" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
        time →
      </text>
      <text x="340" y="342" fontFamily={MONO} fontSize="10.5" fill={SIGNAL} textAnchor="middle">
        the moment you chose
      </text>
      <text x="516" y="292" fontFamily={MONO} fontSize="10.5" fill={FAINT} textAnchor="end">
        zero from here
      </text>

      <g style={chip(0.2)}>
        <rect x="352" y="132" width="170" height="32" fill="#E3EDF6" />
        <text x="437" y="153" fontFamily={MONO} fontSize="12.5" fill={ACCENT} textAnchor="middle">
          removed automatically
        </text>
      </g>

      <Foot k="ALLOWANCE AFTER EXPIRY" v="zero" color={SIGNAL} />
    </g>
  );
}

/* 04 · Anyone can execute an expiry that is due. */
function Keeper() {
  const actors = ["a bot", "a wallet", "you"];
  return (
    <g>
      {actors.map((a, i) => (
        <g key={a} style={fade(0.1 + i * 0.1)}>
          <rect x="60" y={132 + i * 62} width="112" height="42" fill="#fff" stroke={LINE} />
          <text
            x="116"
            y={158 + i * 62}
            fontFamily={MONO}
            fontSize="11"
            fill={INK}
            textAnchor="middle"
          >
            {a}
          </text>
          <line
            x1="172"
            y1={153 + i * 62}
            x2="238"
            y2={215}
            stroke={LINE}
            strokeDasharray="4 5"
            style={fade(0.3 + i * 0.1)}
          />
        </g>
      ))}

      <g style={fade(0.35)}>
        <rect x="240" y="176" width="176" height="78" fill="#F7EDDC" />
        <text x="328" y="206" fontFamily={MONO} fontSize="11" fill={SIGNAL} textAnchor="middle">
          expiry registry
        </text>
        <text x="328" y="228" fontFamily={MONO} fontSize="10.5" fill={FAINT} textAnchor="middle">
          allowance set to zero
        </text>
      </g>

      <line
        x1="416"
        y1="215"
        x2="500"
        y2="215"
        stroke={ACCENT}
        strokeWidth="2.4"
        strokeDasharray="640"
        style={draw(0.5)}
      />
      <text x="500" y="204" fontFamily={MONO} fontSize="10.5" fill={ACCENT} textAnchor="end">
        reward
      </text>

      <text x="60" y="300" fontFamily={MONO} fontSize="10.5" fill={FAINT}>
        no gatekeeper, no allow list, no permission needed
      </text>

      <Foot k="WHO CAN EXECUTE" v="anyone" color={ACCENT} />
    </g>
  );
}
