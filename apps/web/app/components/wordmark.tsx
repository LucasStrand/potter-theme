export function Wordmark() {
  return (
    <div className="relative inline-block">
      <h1 className="ink-reveal font-display m-0 font-semibold leading-none tracking-tight text-[clamp(64px,15vw,200px)]">
        Potter
        <span className="ink-dot" style={{ color: "var(--site-accent, var(--potter-peach))" }}>
          .
        </span>
      </h1>
      {/* quill swash */}
      <svg
        className="flourish pointer-events-none absolute -bottom-2 left-0 w-full"
        height="40"
        viewBox="0 0 600 40"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 26 C 120 8, 220 8, 320 20 C 400 30, 470 32, 560 14 C 575 11, 588 12, 594 20"
          stroke="var(--site-accent, var(--potter-peach))"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
