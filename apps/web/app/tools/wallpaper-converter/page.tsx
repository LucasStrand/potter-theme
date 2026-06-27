import type { Metadata } from "next";
import { WallpaperStudio } from "../../components/wallpaper-studio";

export const metadata: Metadata = {
  title: "Wallpaper Studio — recolor any image to your theme",
  description:
    "Drop in any image and re-ink it onto Potter, Catppuccin, Gruvbox, Dracula, Nord, Tokyo Night or Rosé Pine. Live before/after preview, full-resolution PNG export — all in your browser.",
  openGraph: {
    title: "Wallpaper Studio — Potter",
    description: "Recolor any wallpaper to Potter, Catppuccin, Gruvbox, Dracula, Nord, Tokyo Night or Rosé Pine.",
    url: "https://potter.nu/tools/wallpaper-converter",
    siteName: "Potter",
    type: "website",
  },
};

export default function WallpaperConverterPage() {
  return <WallpaperStudio />;
}
