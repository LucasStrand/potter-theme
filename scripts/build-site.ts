/**
 * Stages the generated CSS port and palette.json into docs/assets so the
 * website is self-contained (GitHub Pages serves /docs as the site root).
 * Run after `npm run generate`. Part of `npm run build`.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const assets = resolve(root, "docs", "assets");
mkdirSync(assets, { recursive: true });

const files: [string, string][] = [
  [resolve(root, "ports/css/dist/potter.css"), resolve(assets, "potter.css")],
  [resolve(root, "palette/palette.json"), resolve(assets, "palette.json")],
];

for (const [from, to] of files) {
  copyFileSync(from, to);
  console.log(`  staged ${to.replace(root, ".")}`);
}

// Inline the palette as a JS global so the site works from file:// (no fetch/CORS).
const json = readFileSync(resolve(root, "palette/palette.json"), "utf8");
writeFileSync(resolve(assets, "palette.js"), `window.POTTER = ${json.trim()};\n`);
console.log("  staged ./docs/assets/palette.js");
console.log("✓ site assets staged.");
