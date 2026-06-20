import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCENTS, NEUTRALS, COLOR_ORDER, FLAVORS } from "../palette/src/colors.ts";

const palette = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../palette/palette.json"), "utf8"),
);
const FLAVOR_IDS = ["parchment", "quill", "ink"] as const;

test("palette.json is built and current (run build-palette if this fails)", () => {
  for (const id of FLAVOR_IDS) {
    assert.ok(palette[id], `missing flavor ${id}`);
    for (const name of COLOR_ORDER) {
      assert.equal(
        palette[id].colors[name].hex,
        FLAVORS[id].colors[name],
        `${id}.${name} hex out of sync with source`,
      );
    }
  }
});

test("each flavor has exactly 26 colors", () => {
  for (const id of FLAVOR_IDS) {
    assert.equal(Object.keys(palette[id].colors).length, 26);
  }
});

test("exactly 14 accents and 12 neutrals per flavor", () => {
  assert.equal(ACCENTS.length, 14);
  assert.equal(NEUTRALS.length, 12);
  for (const id of FLAVOR_IDS) {
    const accents = Object.values(palette[id].colors).filter((c: any) => c.accent);
    assert.equal(accents.length, 14, `${id} accent count`);
  }
});

test("every color has valid hex + matching rgb + hsl", () => {
  for (const id of FLAVOR_IDS) {
    for (const [name, c] of Object.entries<any>(palette[id].colors)) {
      assert.match(c.hex, /^#[0-9a-f]{6}$/, `${id}.${name} hex`);
      assert.ok(c.rgb.r >= 0 && c.rgb.r <= 255, `${id}.${name} rgb.r`);
      assert.ok(c.hsl.h >= 0 && c.hsl.h <= 360, `${id}.${name} hsl.h`);
    }
  }
});

test("ANSI map has 8 entries with normal (0-7) and bright (8-15) codes", () => {
  for (const id of FLAVOR_IDS) {
    const ansi = palette[id].ansi;
    assert.equal(Object.keys(ansi).length, 8);
    for (const entry of Object.values<any>(ansi)) {
      assert.ok(entry.normal.code >= 0 && entry.normal.code <= 7);
      assert.equal(entry.bright.code, entry.normal.code + 8);
    }
  }
});

test("flavor metadata: parchment light, quill+ink dark", () => {
  assert.equal(palette.parchment.dark, false);
  assert.equal(palette.quill.dark, true);
  assert.equal(palette.ink.dark, true);
  assert.equal(palette.parchment.name, "Potter Parchment");
});
