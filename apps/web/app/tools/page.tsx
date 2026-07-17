import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tools — the Potter workshop",
  description: "Small, focused tools from the Potter workshop: a wallpaper recolor studio, a background remover, an SVG → PNG converter, and Pensive.",
};

const TOOLS = [
  {
    href: "/tools/wallpaper-converter",
    eyebrow: "recolor",
    title: "Wallpaper Studio",
    blurb: "Re-ink any image onto Potter, Catppuccin, Gruvbox, Dracula, Nord, Tokyo Night or Rosé Pine — full-res PNG, all in the browser.",
  },
  {
    href: "/tools/background-remover",
    eyebrow: "cut out",
    title: "Background Remover",
    blurb: "Drop a photo, keep the subject. A salient-object model runs in your browser and hands back a full-res PNG with real transparency.",
  },
  {
    href: "/svgpng-converter",
    eyebrow: "rasterize",
    title: "SVG → PNG",
    blurb: "Convert SVG to PNG at any size with a live transparency preview and hand tools to make the alpha exactly right.",
  },
  {
    href: "/tools/pensive",
    eyebrow: "review",
    title: "Pensive",
    blurb: "Pour the diff in, see what you missed. A focused, distraction-free code review reader.",
  },
];

export default function ToolsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
        </div>

        <header className="mt-12 sm:mt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            the workshop
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Tools
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Small, sharp tools — all client-side, nothing uploaded anywhere.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex flex-col rounded-2xl p-6 transition-colors"
              style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--site-accent, var(--potter-peach))" }}>
                {t.eyebrow}
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold" style={{ color: "var(--potter-text)" }}>
                {t.title}
              </h2>
              <p className="mt-2 flex-1 text-sm" style={{ color: "var(--potter-subtext0)" }}>{t.blurb}</p>
              <span className="mt-4 text-sm transition-transform group-hover:translate-x-0.5" style={{ color: "var(--site-accent, var(--potter-peach))" }}>
                Open →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
