import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Section } from "./components/section";
import { PaletteExplorer } from "./components/palette-explorer";
import { Showroom } from "./components/showroom";
import { WallpaperConverter } from "./components/wallpaper-converter";
import { Ports } from "./components/ports";
import { Install } from "./components/install";
import { UnderConstruction } from "./components/under-construction";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <>
      <span id="top" />
      <Nav />
      <main>
        <Hero />

        <Section
          id="palette"
          eyebrow="the palette"
          title="Three flavors"
          lead="14 hues + 12 neutrals each. Hover any swatch to inspect it; click to copy its hex."
        >
          <PaletteExplorer />
        </Section>

        <Section
          id="showroom"
          eyebrow="in the wild"
          title="It just looks so right everywhere"
          lead="The same source palette drives your editor and your terminal."
        >
          <Showroom />
        </Section>

        <Section
          id="wallpaper"
          eyebrow="make it yours"
          title="Potter your wallpaper"
          lead="Drop in any image, and with the flick and a swish of your wand, re-ink it in your flavor."
        >
          <WallpaperConverter />
        </Section>

        <Section
          id="ports"
          eyebrow="ports"
          title="Drop it into your whole setup"
          lead="One source of truth, generated into every target. Web, editors, terminals, and your Arch (btw) desktop."
        >
          <Ports />
        </Section>

        <Section
          id="install"
          eyebrow="install"
          title="Two lines to paper & ink"
          lead="Pick your target. The snippet follows the flavor you've selected."
        >
          <Install />
        </Section>

        <UnderConstruction />
      </main>
      <Footer />
    </>
  );
}
