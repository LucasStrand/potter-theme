import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext, render, parseTemplate, expandFilename } from "../generator/src/render.ts";

const palette = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../palette/palette.json"), "utf8"),
);
const quill = buildContext("quill", palette.quill);
const parchment = buildContext("parchment", palette.parchment);

test("inline color paths", () => {
  assert.equal(render("{{peach.hex}}", quill), "#e08a6a");
  assert.equal(render("{{peach}}", quill), "#e08a6a"); // bare color -> hex
  assert.equal(render("{{peach.rgb.r}}", quill), "224");
  assert.equal(render("{{flavor.name}}", quill), "Potter Quill");
});

test("helpers", () => {
  assert.equal(render("{{mix #000000 #ffffff 0.5}}", quill), "#808080");
  assert.equal(render("{{alpha #d97757 1}}", quill), "#d97757ff");
  assert.equal(render("{{rgb base}}", quill), "rgb(28, 24, 18)");
  assert.equal(render("{{bare peach}}", quill), "e08a6a");
});

test("conditionals resolve flavor.dark", () => {
  assert.equal(render("{{#if dark}}D{{/if}}{{#unless dark}}L{{/unless}}", quill), "D");
  assert.equal(render("{{#if dark}}D{{/if}}{{#unless dark}}L{{/unless}}", parchment), "L");
});

test("each over accents yields 14 items", () => {
  const out = render("{{#each accents}}{{name}};{{/each}}", quill);
  assert.equal(out.split(";").filter(Boolean).length, 14);
});

test("nested each (flavors > colorList) works for single-mode CSS shape", () => {
  const ctx: any = { ...quill };
  ctx.flavors = [
    { id: "quill", colorList: quill.colorList },
    { id: "ink", colorList: parchment.colorList },
  ];
  const out = render("{{#each flavors}}[{{id}}:{{#each colorList}}{{name}},{{/each}}]{{/each}}", ctx);
  assert.match(out, /^\[quill:rosewater,/);
  assert.ok(out.includes("][ink:"));
});

test("frontmatter parsing + filename expansion", () => {
  const { frontmatter, body } = parseTemplate("---\nfilename: potter-{flavor}.css\nout: dist\n---\nX{{peach}}");
  assert.equal(frontmatter.filename, "potter-{flavor}.css");
  assert.equal(frontmatter.out, "dist");
  assert.equal(body.trim(), "X{{peach}}");
  assert.equal(expandFilename("potter-{flavor}.css", "quill"), "potter-quill.css");
  assert.equal(expandFilename("{Flavor}.lua", "ink"), "Ink.lua");
});
