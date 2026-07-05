export function Section({
  id,
  index,
  eyebrow,
  title,
  lead,
  tinted = false,
  children,
}: {
  id?: string;
  /** chapter number, e.g. "01" — rendered in the eyebrow rule */
  index?: string;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  /** full-bleed mantle band with feathered edges, for scroll rhythm */
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative scroll-mt-16${tinted ? " section-tinted" : ""}`}>
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <div className="flex items-center gap-4">
          {index && (
            <span
              className="font-display text-sm italic"
              style={{ color: "var(--site-accent, var(--potter-peach))" }}
            >
              {index}
            </span>
          )}
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            {eyebrow}
          </p>
          <span aria-hidden className="h-px flex-1" style={{ background: "var(--potter-surface0)" }} />
        </div>
        <h2 className="font-display mt-4 max-w-3xl text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
          {title}
        </h2>
        {lead && (
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            {lead}
          </p>
        )}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
