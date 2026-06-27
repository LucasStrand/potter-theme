import type { Metadata } from "next";
import { SvgPngConverter } from "../components/svg-png-converter";

export const metadata: Metadata = {
  title: "SVG → PNG — crisp, honestly transparent",
  description:
    "Rasterize any SVG to PNG at any size, preview it over a transparency checkerboard, and clean up the alpha by hand with color-key removal, flood fill and an eraser. Runs entirely in your browser.",
  openGraph: {
    title: "SVG → PNG converter — Potter",
    description: "Convert SVG to PNG with a live preview and real, verifiable transparency.",
    url: "https://potter.nu/svgpng-converter",
    siteName: "Potter",
    type: "website",
  },
};

export default function SvgPngConverterPage() {
  return <SvgPngConverter />;
}
