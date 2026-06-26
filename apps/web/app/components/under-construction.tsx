// "Pottertools coming soon" teaser — an ink-drawn sawhorse barrier + caution
// tape, all palette-driven. The art is inline SVG, so it's transparent by
// nature (no background to remove) and re-inks with the active flavor/accent.

const HAZARD =
  "repeating-linear-gradient(45deg, var(--site-accent, var(--potter-peach)) 0 13px, var(--potter-surface1) 13px 26px)";

export function UnderConstruction() {
  return (
    <section id="pottertools" className="mx-auto w-full max-w-6xl scroll-mt-16 px-6 py-20 sm:py-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
        the workshop
      </p>
      <h2 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
        Under construction
      </h2>

      <div className="mt-10">
        <div className="surface-card relative mx-auto max-w-3xl overflow-hidden text-center">
          {/* caution tape — top */}
          <div aria-hidden className="h-3.5 w-full opacity-90" style={{ backgroundImage: HAZARD }} />

          <div className="px-8 py-14 sm:py-16">
            {/* ink-drawn sawhorse barrier (transparent bg) */}
            <svg
              role="img"
              aria-label="A construction sawhorse barrier"
              viewBox="0 0 220 150"
              className="mx-auto h-32 w-auto sm:h-40"
              fill="none"
              style={{ color: "var(--potter-text)" }}
            >
              {/* ground shadow */}
              <line x1="24" y1="137" x2="196" y2="137" stroke="var(--potter-overlay0)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />

              {/* legs — two A-frames */}
              <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                <line x1="52" y1="60" x2="40" y2="134" />
                <line x1="76" y1="60" x2="88" y2="134" />
                <line x1="48" y1="98" x2="80" y2="98" />
                <line x1="144" y1="60" x2="132" y2="134" />
                <line x1="168" y1="60" x2="180" y2="134" />
                <line x1="140" y1="98" x2="172" y2="98" />
              </g>

              {/* plank: base fill, hazard stripes clipped, ink outline */}
              <defs>
                <clipPath id="uc-plank">
                  <rect x="28" y="40" width="164" height="22" rx="6" />
                </clipPath>
              </defs>
              <rect x="28" y="40" width="164" height="22" rx="6" fill="var(--potter-base)" />
              <g clipPath="url(#uc-plank)" stroke="var(--site-accent, var(--potter-peach))" strokeWidth="10">
                {Array.from({ length: 11 }, (_, i) => 6 + i * 22).map((x) => (
                  <line key={x} x1={x} y1="66" x2={x + 26} y2="36" />
                ))}
              </g>
              <rect x="28" y="40" width="164" height="22" rx="6" fill="none" stroke="currentColor" strokeWidth="3.5" />
            </svg>

            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: "var(--potter-overlay2)" }}>
              wet paint · mind the ink
            </p>

            <h3 className="font-display mt-3 text-3xl font-semibold sm:text-4xl" style={{ color: "var(--potter-text)" }}>
              Pottertools{" "}
              <span style={{ color: "var(--site-accent, var(--potter-peach))" }}>coming soon</span>
              <span aria-hidden style={{ color: "var(--potter-overlay2)" }}>…</span>
            </h3>

            <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
              A set of tools for working with Potter. Whatever that means. Still laying the bricks
              by the bricks, so please check back zoon whenever my lazy ahh pulled my thumb out of{" "}
              <span className="glitch" data-text="technical difficulties">technical difficulties</span>
            </p>

            <div className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--potter-subtext1)" }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--site-accent, var(--potter-peach))" }} />
              in progress
            </div>
          </div>

          {/* caution tape — bottom */}
          <div aria-hidden className="h-3.5 w-full opacity-90" style={{ backgroundImage: HAZARD }} />
        </div>
      </div>
    </section>
  );
}
