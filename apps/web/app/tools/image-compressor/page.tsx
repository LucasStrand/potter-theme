import type { Metadata } from "next";
import { ImageCompressor } from "../../components/image-compressor";

export const metadata: Metadata = {
  title: "Image compressor — under the limit, nothing cut",
  description:
    "Shrink any image under a file-size limit in your browser. Quality gives way first, then size — evenly, so the shape stays and nothing is cropped.",
  openGraph: {
    title: "Image compressor — Potter",
    description: "Say how big the file may be. Quality gives way first; nothing is cropped.",
    url: "https://potter.nu/tools/image-compressor",
    siteName: "Potter",
    type: "website",
  },
};

export default function ImageCompressorPage() {
  return <ImageCompressor />;
}
