/**
 * Quills CLI — regenerates every port from its templates.
 * Run: `npm run generate`  (node generator/src/cli.ts [--check])
 *
 * Convention:
 *   ports/<port>/templates/<file>.pottertmpl   ->   ports/<port>/<out>/<filename>
 *   Frontmatter:  filename: potter-{flavor}.css | out: dist | flavors: all|csv | single: true
 *   `single: true` renders ONE file containing all flavors (the template handles
 *   iteration itself via {{#each ...}} over a provided `flavors` list — used for CSS).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";
import {
  parseTemplate,
  render,
  buildContext,
  targetFlavors,
  expandFilename,
  type RenderContext,
} from "./render.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const portsDir = resolve(root, "ports");

const palette = JSON.parse(readFileSync(resolve(root, "palette", "palette.json"), "utf8"));
const FLAVOR_IDS = ["parchment", "quill", "ink"];
const contexts: Record<string, RenderContext> = {};
for (const id of FLAVOR_IDS) contexts[id] = buildContext(id, palette[id]);

const checkOnly = process.argv.includes("--check");

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (p.endsWith(".pottertmpl")) out.push(p);
  }
  return out;
}

function existsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

if (!existsDir(portsDir)) {
  console.error("No ports/ directory found — nothing to generate.");
  process.exit(0);
}

const templates = walk(portsDir);
let written = 0;
let drift = 0;

for (const tmplPath of templates) {
  const portRoot = resolve(tmplPath, "..", ".."); // ports/<port>
  const src = readFileSync(tmplPath, "utf8");
  const { frontmatter, body } = parseTemplate(src);
  const outDir = frontmatter.out ? resolve(portRoot, frontmatter.out) : portRoot;
  const filenamePattern = frontmatter.filename ?? "potter-{flavor}.txt";

  const emit = (outPath: string, content: string) => {
    if (checkOnly) {
      let current = "";
      try {
        current = readFileSync(outPath, "utf8");
      } catch {
        /* missing */
      }
      if (current !== content) {
        drift++;
        console.error(`✗ drift: ${relative(root, outPath)}`);
      }
      return;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
    written++;
    console.log(`  → ${relative(root, outPath)}`);
  };

  if (frontmatter.single === "true") {
    // One output for all flavors: expose every flavor context under `flavors`.
    const ctx = { ...contexts[FLAVOR_IDS[0]] } as RenderContext & { flavors: unknown };
    (ctx as unknown as Record<string, unknown>).flavors = FLAVOR_IDS.map((id) => ({
      ...contexts[id],
      id,
      dark: contexts[id].flavor.dark,
      name: contexts[id].flavor.name,
      default_light: id === "parchment",
      default_dark: id === "quill",
      colorList: contexts[id].colorList,
    }));
    const content = render(body, ctx);
    emit(resolve(outDir, expandFilename(filenamePattern, "all")), content);
  } else {
    for (const fid of targetFlavors(frontmatter, FLAVOR_IDS)) {
      const content = render(body, contexts[fid]);
      emit(resolve(outDir, expandFilename(filenamePattern, fid)), content);
    }
  }
}

if (checkOnly) {
  if (drift > 0) {
    console.error(`\n✗ ${drift} file(s) out of date. Run \`npm run generate\`.`);
    process.exit(1);
  }
  console.log(`✓ all generated files up to date (${templates.length} templates).`);
} else {
  console.log(`\n✓ generated ${written} file(s) from ${templates.length} template(s).`);
}
