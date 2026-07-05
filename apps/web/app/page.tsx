import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Marquee } from "./components/marquee";
import { ScrollInk } from "./components/scroll-ink";
import { Section } from "./components/section";
import { PaletteExplorer } from "./components/palette-explorer";
import { Showroom } from "./components/showroom";
import { WallpaperConverter } from "./components/wallpaper-converter";
import Link from "next/link";
import { Ports } from "./components/ports";
import { Install } from "./components/install";
import { PensiveHero } from "./components/pensive/pensive-hero";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <>
      <span id="top" />
      <ScrollInk />
      <Nav />
      <main>
        <Hero />

        <Marquee />

        <Section
          id="palette"
          index="01"
          eyebrow="the palette"
          title="Three flavors"
          lead="14 hues + 12 neutrals each. Hover any swatch to inspect it; click to copy its hex."
        >
          <PaletteExplorer />
        </Section>

        <Section
          id="showroom"
          index="02"
          eyebrow="in the wild"
          title="It just looks so right everywhere"
          lead="The same source palette drives your editor and your terminal."
          tinted
        >
          <Showroom />
        </Section>

        <Section
          id="wallpaper"
          index="03"
          eyebrow="make it yours"
          title="Potter your wallpaper"
          lead="Drop in any image, and with the flick and a swish of your wand, re-ink it in your flavor."
        >
          <WallpaperConverter />
          <p className="mt-6 text-sm" style={{ color: "var(--potter-subtext0)" }}>
            Want other palettes — Catppuccin, Gruvbox, Nord and more?{" "}
            <Link
              href="/tools/wallpaper-converter"
              className="underline underline-offset-4 transition-colors hover:text-[var(--potter-text)]"
              style={{ color: "var(--site-accent, var(--potter-peach))" }}
            >
              Open the full Wallpaper Studio →
            </Link>
          </p>
        </Section>

        <Section
          id="ports"
          index="04"
          eyebrow="ports"
          title="Drop it into your whole setup"
          lead="One source of truth, generated into every target. Web, editors, terminals, and your Arch (btw) desktop."
          tinted
        >
          <Ports />
        </Section>

        <Section
          id="install"
          index="05"
          eyebrow="install"
          title="Two lines to paper & ink"
          lead="Pick your target. The snippet follows the flavor you've selected."
        >
          <Install />
        </Section>

        <Section
          id="pensive"
          index="06"
          eyebrow="from the workshop"
          title="Meet Pensive"
          lead={
            <>
              The first{" "}
              <Link
                href="/tools"
                className="underline underline-offset-4 transition-colors hover:text-[var(--potter-text)]"
                style={{ color: "var(--site-accent, var(--potter-peach))" }}
              >
                Pottertool
              </Link>
              : a more thoughtful code review
            </>
          }
        >
          <div
            className="overflow-hidden rounded-3xl"
            style={{
              border: "1px solid var(--potter-surface0)",
              boxShadow: "0 30px 80px -40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <PensiveHero embedded />
          </div>
          <p className="mt-6 text-sm" style={{ color: "var(--potter-subtext0)" }}>
            Downloads, features and the full story live on its own page.{" "}
            <Link
              href="/tools/pensive"
              className="underline underline-offset-4 transition-colors hover:text-[var(--potter-text)]"
              style={{ color: "var(--site-accent, var(--potter-peach))" }}
            >
              Open Pensive →
            </Link>
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
