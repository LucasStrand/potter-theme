import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Pin the workspace root to the monorepo (apps/web is two levels down).
// Otherwise Next infers it from a stray lockfile in the home dir and the
// dev-server manifest resolves to the wrong place ("Manifest file is empty").
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  // @potternu/palette ships ESM + JSON; let Next transpile it cleanly.
  transpilePackages: ["@potternu/palette"],
};

export default nextConfig;
