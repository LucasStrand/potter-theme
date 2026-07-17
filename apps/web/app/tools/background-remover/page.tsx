import type { Metadata } from "next";
import { BackgroundRemover } from "../../components/background-remover";

export const metadata: Metadata = {
  title: "Background remover — keep the subject, lose the rest",
  description:
    "Cut the background out of any photo in your browser. A salient-object model runs locally, gives you full-resolution PNGs with real transparency, and never uploads your image.",
  openGraph: {
    title: "Background remover — Potter",
    description: "Drop a photo, keep the subject. Runs entirely in your browser — nothing uploaded.",
    url: "https://potter.nu/tools/background-remover",
    siteName: "Potter",
    type: "website",
  },
};

export default function BackgroundRemoverPage() {
  return <BackgroundRemover />;
}
