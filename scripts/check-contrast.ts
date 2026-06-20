/**
 * Prints WCAG 2.x contrast ratios for Potter and flags failures.
 * Run: `npm run contrast`
 *
 * Gates (exit 1 on failure):
 *   - text on base        >= 4.5 (AA body text)
 *   - subtext1 on base    >= 4.5
 *   - subtext0 on base    >= 3.0 (AA large / muted)
 * Accents on base are reported as info (syntax tokens target >= 3.0); they warn
 * but do not fail the build, since draft hues are still being tuned.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contrast } from "../lib/color.ts";
import { ACCENTS } from "../palette/src/colors.ts";

const palette = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../palette/palette.json"), "utf8"),
);
const FLAVOR_IDS = ["parchment", "quill", "ink"] as const;

const hex = (id: string, name: string): string => palette[id].colors[name].hex;
const fmt = (n: number) => n.toFixed(2).padStart(5);
const mark = (ratio: number, min: number) => (ratio >= min ? "ok " : "FAIL");

let failures = 0;
let accentWarnings = 0;

for (const id of FLAVOR_IDS) {
  console.log(`\n=== ${palette[id].name} ===`);

  const coreChecks: [string, string, number][] = [
    ["text", "base", 4.5],
    ["text", "mantle", 4.5],
    ["text", "surface0", 4.5],
    ["subtext1", "base", 4.5],
    ["subtext0", "base", 3.0],
  ];
  for (const [fg, bg, min] of coreChecks) {
    const r = contrast(hex(id, fg), hex(id, bg));
    const status = mark(r, min);
    if (status === "FAIL") failures++;
    console.log(`  ${status}  ${fg.padEnd(9)} on ${bg.padEnd(9)} ${fmt(r)}  (min ${min})`);
  }

  console.log("  accents on base (target >= 3.0 for syntax):");
  for (const a of ACCENTS) {
    const r = contrast(hex(id, a), hex(id, "base"));
    const status = r >= 3.0 ? "ok " : "low";
    if (status === "low") accentWarnings++;
    console.log(`    ${status} ${a.padEnd(10)} ${fmt(r)}`);
  }
}

console.log(
  `\nSummary: ${failures} core failure(s), ${accentWarnings} accent(s) below 3.0 (informational).`,
);
if (failures > 0) {
  console.error("✗ core text contrast gate failed.");
  process.exit(1);
}
console.log("✓ core text contrast gate passed.");
