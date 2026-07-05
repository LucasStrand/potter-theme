/**
 * A slow ticker of the theme's vitals between hero and first section —
 * hairline-bordered, monospace, deliberately quiet. Content is doubled so
 * the CSS loop is seamless; reduced motion stops it (see globals.css).
 */
const ITEMS = [
  "paper & ink",
  "three flavors",
  "fourteen accents",
  "twelve neutrals",
  "one source of truth",
  "your editor",
  "your terminal",
  "your whole desktop",
];

function Run() {
  return (
    <span className="marquee-run inline-flex items-center gap-8 pr-8" aria-hidden>
      {ITEMS.map((t) => (
        <span key={t} className="inline-flex items-center gap-8">
          <span>{t}</span>
          <span style={{ color: "var(--site-accent, var(--potter-peach))" }}>✦</span>
        </span>
      ))}
    </span>
  );
}

export function Marquee() {
  return (
    <div
      className="marquee relative overflow-hidden py-3.5 font-mono text-[11px] uppercase tracking-[0.3em] whitespace-nowrap"
      style={{
        color: "var(--potter-subtext0)",
        borderTop: "1px solid var(--potter-surface0)",
        borderBottom: "1px solid var(--potter-surface0)",
        background: "rgb(var(--potter-mantle-rgb) / 0.5)",
      }}
    >
      <span className="sr-only">{ITEMS.join(", ")}</span>
      <div className="marquee-track flex w-max items-center">
        <Run />
        <Run />
      </div>
    </div>
  );
}
