/**
 * The Potter logo = the hero wordmark, scaled down: "Potter" in the display face
 * (Fraunces) + the accent dot, with the quill swash drawn underneath. Colors
 * track the live flavor + accent. Size it via a text-* class on `className`.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display relative inline-block font-semibold leading-none ${className}`}
      style={{ color: "var(--potter-text)" }}
      aria-label="Potter"
    >
      Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
      <svg
        className="pointer-events-none absolute left-0 w-full"
        style={{ bottom: "-0.22em", height: "0.32em" }}
        viewBox="0 0 600 40"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M8 26 C 120 8, 220 8, 320 20 C 400 30, 470 32, 560 14 C 575 11, 588 12, 594 20"
          stroke="var(--site-accent, var(--potter-peach))"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
