import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { Section } from "./components/section";
import { PaletteExplorer } from "./components/palette-explorer";
import { Showroom } from "./components/showroom";
import { Ports } from "./components/ports";
import { Install } from "./components/install";
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
          title="Twenty-six colors, three flavors"
          lead="14 hues + 12 neutrals per flavor. Hover to inspect, click to copy. Every value is contrast-checked against its base."
        >
          <PaletteExplorer />
        </Section>

        <Section
          id="showroom"
          eyebrow="in the wild"
          title="It looks right everywhere"
          lead="The same source palette drives your editor and your terminal. Switch the flavor — these re-ink with the rest of the page."
        >
          <Showroom />
        </Section>

        <Section
          id="ports"
          eyebrow="ports"
          title="Drop it into your whole setup"
          lead="One source of truth, generated into every target. Web, editors, terminals, and your Arch desktop."
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
      </main>
      <Footer />
    </>
  );
}
