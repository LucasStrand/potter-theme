"use client";
import { FlavorSwitch } from "./flavor-switch";
import { Logo } from "./logo";

export function Nav() {
  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ background: "rgb(var(--potter-mantle-rgb) / 0.82)", borderBottom: "1px solid var(--potter-surface0)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
        <a href="#top" aria-label="Potter — home" className="transition-opacity hover:opacity-80">
          <Logo className="text-lg" />
        </a>
        <div className="ml-auto hidden items-center gap-6 text-sm sm:flex" style={{ color: "var(--potter-subtext1)" }}>
          <a href="#palette" className="transition-colors hover:text-[var(--potter-text)]">Palette</a>
          <a href="#showroom" className="transition-colors hover:text-[var(--potter-text)]">Showroom</a>
          <a href="#wallpaper" className="transition-colors hover:text-[var(--potter-text)]">Wallpaper</a>
          <a href="#install" className="transition-colors hover:text-[var(--potter-text)]">Install</a>
          <a
            href="https://github.com/LucasStrand/potter-theme"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[var(--potter-text)]"
          >
            GitHub ↗
          </a>
        </div>
        <div className="ml-auto sm:ml-0">
          <FlavorSwitch size="sm" />
        </div>
      </div>
    </nav>
  );
}
