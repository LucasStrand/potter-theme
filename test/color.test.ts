import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hexToHsl,
  mix,
  lighten,
  darken,
  alpha,
  rgbString,
  contrast,
} from "../lib/color.ts";

test("hexToRgb parses with and without hash", () => {
  assert.deepEqual(hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb("000000"), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb("#d97757"), { r: 217, g: 119, b: 87 });
});

test("hexToRgb rejects bad input", () => {
  assert.throws(() => hexToRgb("#zzz"));
  assert.throws(() => hexToRgb("#1234"));
});

test("rgbToHex round-trips and clamps", () => {
  assert.equal(rgbToHex({ r: 217, g: 119, b: 87 }), "#d97757");
  assert.equal(rgbToHex({ r: 300, g: -5, b: 87 }), "#ff0057");
});

test("rgbToHsl known values", () => {
  assert.deepEqual(rgbToHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
  assert.deepEqual(rgbToHsl({ r: 0, g: 0, b: 0 }), { h: 0, s: 0, l: 0 });
  assert.deepEqual(hexToHsl("#ffffff"), { h: 0, s: 0, l: 100 });
});

test("mix endpoints and midpoint", () => {
  assert.equal(mix("#000000", "#ffffff", 0), "#000000");
  assert.equal(mix("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  // clamps out-of-range amounts
  assert.equal(mix("#000000", "#ffffff", 2), "#ffffff");
});

test("lighten/darken move toward white/black", () => {
  assert.equal(lighten("#808080", 1), "#ffffff");
  assert.equal(darken("#808080", 1), "#000000");
});

test("alpha appends 8-bit alpha", () => {
  assert.equal(alpha("#d97757", 1), "#d97757ff");
  assert.equal(alpha("#d97757", 0), "#d9775700");
});

test("rgbString format", () => {
  assert.equal(rgbString("#d97757"), "rgb(217, 119, 87)");
});

test("contrast: black on white is 21, identical is 1", () => {
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01);
  assert.ok(Math.abs(contrast("#abcdef", "#abcdef") - 1) < 0.001);
  // symmetric
  assert.equal(contrast("#000000", "#ffffff"), contrast("#ffffff", "#000000"));
});
