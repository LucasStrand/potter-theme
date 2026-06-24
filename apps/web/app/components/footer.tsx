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
          <span style={{ color: "var(--potter-overlay1)" }}>npm — soon</span>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
        Built with <span style={{ color: "var(--site-accent, var(--potter-peach))" }}>&#9829;</span> by Potter
      </p>
    </footer>
  );
}
