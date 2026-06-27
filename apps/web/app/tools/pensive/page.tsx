import type { Metadata } from "next";
import { PensiveHero } from "../../components/pensive/pensive-hero";
import { PensiveFeatures } from "../../components/pensive/pensive-features";
import { PensiveFooter } from "../../components/pensive/pensive-footer";

export const metadata: Metadata = {
  title: "Pensive — code review, reconsidered",
  description:
    "Pensive makes code reviews a bit more zen, and a bit more thoughtful. Pour the diff in, see what you missed. A Potter workshop tool — paper & ink, for diffs.",
  openGraph: {
    title: "Pensive — code review, reconsidered",
    description: "Pour the diff in. See what you missed. A focused, distraction-free code review reader from the Potter workshop.",
    url: "https://potter.nu/tools/pensive",
    siteName: "Potter",
    type: "website",
  },
};

export default function PensivePage() {
  return (
    <main style={{ background: "#1c1812" }}>
      <PensiveHero />
      <PensiveFeatures />
      <PensiveFooter />
    </main>
  );
}
