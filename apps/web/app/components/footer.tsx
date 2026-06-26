import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-10 border-t px-6 py-14" style={{ borderColor: "var(--potter-surface0)", background: "var(--potter-mantle)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Logo className="text-xl" />
          <p className="mt-2 text-sm" style={{ color: "var(--potter-subtext0)" }}>
            paper &amp; ink — Parchment · Quill · Ink
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: "var(--potter-subtext1)" }}>
          <a href="https://github.com/LucasStrand/potter-theme" target="_blank" rel="noreferrer" className="hover:text-[var(--potter-text)]">GitHub</a>
          <a href="https://github.com/LucasStrand/potter-theme/blob/main/STYLE_GUIDE.md" target="_blank" rel="noreferrer" className="hover:text-[var(--potter-text)]">Style guide</a>
          <a href="https://www.npmjs.com/package/@potternu/css" target="_blank" rel="noreferrer" className="hover:text-[var(--potter-text)]">npm</a>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl font-mono text-[11px] leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
        Set in{" "}
        <a href="https://fonts.google.com/specimen/Fraunces" target="_blank" rel="noreferrer" className="hover:text-[var(--potter-text)]" style={{ color: "var(--potter-subtext0)" }}>Fraunces</a>{" "}
        &amp;{" "}
        <a href="https://fonts.google.com/specimen/JetBrains+Mono" target="_blank" rel="noreferrer" className="hover:text-[var(--potter-text)]" style={{ color: "var(--potter-subtext0)" }}>JetBrains&nbsp;Mono</a>{" "}
        — both free &amp; OFL-licensed, so you can wear the whole vibe.
      </p>
      <p className="mx-auto mt-3 max-w-6xl font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
        Built with <span style={{ color: "var(--site-accent, var(--potter-peach))" }}>&#9829;</span> by Potter
      </p>
    </footer>
  );
}
