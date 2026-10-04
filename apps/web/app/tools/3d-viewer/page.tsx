import type { Metadata } from "next";
import { ModelViewer } from "../../components/model-viewer";

export const metadata: Metadata = {
  title: "3D viewer — turn it over in your hands",
  description:
    "Open GLB, GLTF, OBJ, STL, PLY, FBX and 3MF models in your browser. Orbit, zoom, check the triangle count, toggle wireframe and save a snapshot.",
  openGraph: {
    title: "3D viewer — Potter",
    description: "Drop in a model and inspect it — GLB, GLTF, OBJ, STL, PLY, FBX, 3MF.",
    url: "https://potter.nu/tools/3d-viewer",
    siteName: "Potter",
    type: "website",
  },
};

export default function ModelViewerPage() {
  return <ModelViewer />;
}
