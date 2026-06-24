import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @potternu/palette ships ESM + JSON; let Next transpile it cleanly.
  transpilePackages: ["@potternu/palette"],
};

export default nextConfig;
