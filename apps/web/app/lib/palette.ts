import paletteJson from "@potter/palette/palette.json";

export interface ColorEntry {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  accent: boolean;
}
export interface FlavorData {
  name: string;
  dark: boolean;
  order: number;
  colors: Record<string, ColorEntry>;
  ansi: Record<string, { normal: { hex: string }; bright: { hex: string } }>;
}
export type PaletteData = { version: string } & Record<"parchment" | "quill" | "ink", FlavorData>;

export const palette = paletteJson as unknown as PaletteData;

export const ACCENTS = [
  "rosewater", "flamingo", "pink", "mauve", "red", "maroon", "peach",
  "yellow", "green", "teal", "sky", "sapphire", "blue", "lavender",
] as const;

export const NEUTRALS = [
  "text", "subtext1", "subtext0", "overlay2", "overlay1", "overlay0",
  "surface2", "surface1", "surface0", "base", "mantle", "crust",
] as const;

export type ColorName = (typeof ACCENTS)[number] | (typeof NEUTRALS)[number];

// WCAG relative luminance + contrast (kept local so the site has no cross-package runtime dep).
function lin(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
