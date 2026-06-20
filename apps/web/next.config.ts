import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @potter/palette ships ESM + JSON; let Next transpile it cleanly.
  transpilePackages: ["@potter/palette"],
};

export default nextConfig;
