import type { Metadata } from "next";
import { PasteHotel } from "../../components/paste-hotel";

const BASE: Metadata = {
  title: "Paste Hotel — check text in on one screen, out on another",
  description:
    "Move text between devices without logging into anything. Check a paste in, get a six-digit room number, and it checks out on its own.",
  openGraph: {
    title: "Paste Hotel — Potter",
    description: "Check text in on one screen, out on another. No account; it checks out on its own.",
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
