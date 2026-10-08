import type { Metadata } from "next";
import { PasteHotel } from "../../components/paste-hotel";

const BASE: Metadata = {
  title: "Paste Hotel — check text in on one screen, out on another",
  description:
    "Move text and files between devices without logging into anything. Check them in, get a six-digit room number, and they check out on their own.",
  openGraph: {
    title: "Paste Hotel — Potter",
    description: "Check text and files in on one screen, out on another. No account; they check out on their own.",
    url: "https://potter.nu/tools/paste-hotel",
    siteName: "Potter",
    type: "website",
  },
};

// A shared room link must never put a guest's paste in a search index.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { room } = await searchParams;
  return room ? { ...BASE, robots: { index: false, follow: false } } : BASE;
}

export default function PasteHotelPage() {
  return <PasteHotel />;
}
