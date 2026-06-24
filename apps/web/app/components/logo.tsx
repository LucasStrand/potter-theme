/**
 * The Potter logo: the exact "P" from the display face (Fraunces), followed by
 * the accent dot from the hero — here resting on a small quill swash so the dot
 * is connected to the line. Colors track the live flavor + accent.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-semibold leading-none ${className}`}
      style={{ color: "var(--potter-text)" }}
      aria-label="Potter"
    >
      P
      <svg
        viewBox="0 0 28 28"
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.7em",
          height: "0.7em",
          marginLeft: "0.02em",
          verticalAlign: "-0.12em",
        }}
      >
        {/* quill swash — the line the dot is connected to */}
        <path
          d="M3 21 C 9 18, 19 18, 25 21"
          fill="none"
          stroke="var(--site-accent, var(--potter-peach))"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* the accent dot, resting on the swash (the same dot as the hero) */}
        <circle cx="8.6" cy="16" r="4.4" fill="var(--site-accent, var(--potter-peach))" />
      </svg>
    </span>
  );
}
