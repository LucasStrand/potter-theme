import type { Metadata } from "next";
import { HtmlToPdf } from "./html-to-pdf";

export const metadata: Metadata = {
  title: "HTML → PDF — any page, pressed to paper",
  description:
    "Put in an HTML page — paste it, upload it, or drop it — and take out a PDF. Paper size, orientation and margins under your control, rendered by the browser's own engine. Runs entirely in your browser; nothing is uploaded.",
  openGraph: {
    title: "HTML → PDF converter — Potter",
    description: "Convert any HTML page to a PDF with a live preview. A Potter workshop spell.",
    url: "https://potter.nu/spells/html-to-pdf",
    siteName: "Potter",
    type: "website",
  },
};

export default function HtmlToPdfPage() {
  return <HtmlToPdf />;
}
