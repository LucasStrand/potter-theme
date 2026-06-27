/**
 * Potter wallpaper converter — pure recoloring core (zero-dep, framework-agnostic).
 *
 * Recolors an RGBA image to a Potter flavor's palette. Two modes:
 *   - "nearest": each color snapped to the closest palette color (redmean distance).
 *               Crisp, posterized, only Potter colors survive.
 *   - "smooth":  gaussian inverse-distance blend toward palette colors, optionally
 *               re-imposing the source luminance — keeps gradients and shading.
 *
 * For speed at wallpaper resolutions the expensive palette search runs once over a
 * STEP³ RGB cube (a 3D LUT); pixels are then mapped by cheap trilinear interpolation.
 * The same code can later back a CLI — it only needs an {data,width,height} buffer.
 */
import { palette, ACCENTS, NEUTRALS } from "./palette";

export type FlavorId = "parchment" | "quill" | "ink";
export type Mode = "nearest" | "smooth";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ConvertOptions {
  /** Potter flavor; ignored when `targets` is supplied. */
  flavor?: FlavorId;
  mode: Mode;
  /** Blend original → mapped. 0 = untouched, 1 = fully recolored. */
  strength: number;
  /** Smooth-mode gaussian spread (0 = tight/punchy, 1 = soft/washed). */
  softness: number;
  /** Smooth mode only: keep each pixel's original brightness. */
  preserveLuminance: boolean;
  /** Explicit target palette (overrides `flavor`). Powers the multi-theme studio. */
  targets?: RGB[];
}

/** Resolve the target palette for a conversion: explicit `targets` win, else the Potter flavor. */
export function resolveTargets(opts: ConvertOptions): RGB[] {
  return opts.targets && opts.targets.length ? opts.targets : paletteTargets(opts.flavor ?? "quill");
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  flavor: "quill",
  mode: "smooth",
  strength: 1,
  softness: 0.45,
  preserveLuminance: true,
};

/** Default LUT resolution (nodes per axis). 33³ ≈ 36k nodes — a good speed/quality balance. */
export const LUT_STEP = 33;

export interface Lut {
  step: number;
  /** step³ × 3 channel bytes, indexed ((ri*step)+gi)*step + bi. */
  data: Uint8Array;
}

/** Every color of a flavor (14 hues + 12 neutrals) as a target list — a full tonal ramp. */
export function paletteTargets(flavor: FlavorId): RGB[] {
  const colors = palette[flavor].colors;
  return [...ACCENTS, ...NEUTRALS].map((name) => {
    const { r, g, b } = colors[name].rgb;
    return { r, g, b };
  });
}

const clamp8 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n);

/**
 * Redmean color distance (squared). A cheap perceptual approximation that beats plain
 * Euclidean RGB — https://www.compuphase.com/cmetric.htm
 */
function redmean2(r: number, g: number, b: number, t: RGB): number {
  const rmean = (r + t.r) >> 1;
  const dr = r - t.r;
  const dg = g - t.g;
  const db = b - t.b;
  return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

/** Perceptual luma on sRGB bytes (0–255) — cheap brightness for luminance preservation. */
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Build a STEP³ RGB lookup cube mapping every node to its recolored value. */
export function buildLut(targets: RGB[], opts: ConvertOptions, step = LUT_STEP): Lut {
  const data = new Uint8Array(step * step * step * 3);
  const N = step - 1;
  // Gaussian spread for smooth mode: softness 0..1 -> sigma ~24..132 (in 0–255 color space).
  const sigma = 24 + opts.softness * 108;
  const twoSigma2 = 2 * sigma * sigma;

  let p = 0;
  for (let ri = 0; ri < step; ri++) {
    const r = Math.round((ri / N) * 255);
    for (let gi = 0; gi < step; gi++) {
      const g = Math.round((gi / N) * 255);
      for (let bi = 0; bi < step; bi++) {
        const b = Math.round((bi / N) * 255);

        let or: number, og: number, ob: number;

        if (opts.mode === "nearest") {
          let best = Infinity;
          let bt = targets[0];
          for (const t of targets) {
            const d = redmean2(r, g, b, t);
            if (d < best) {
              best = d;
              bt = t;
            }
          }
          or = bt.r;
          og = bt.g;
          ob = bt.b;
        } else {
          // smooth: gaussian inverse-distance weighted average of all targets
          let wr = 0,
            wg = 0,
            wb = 0,
            wsum = 0;
          for (const t of targets) {
            const d2 = redmean2(r, g, b, t);
            const w = Math.exp(-d2 / twoSigma2);
            wr += t.r * w;
            wg += t.g * w;
            wb += t.b * w;
            wsum += w;
          }
          if (wsum > 0) {
            or = wr / wsum;
            og = wg / wsum;
            ob = wb / wsum;
          } else {
            or = r;
            og = g;
            ob = b;
          }
          if (opts.preserveLuminance) {
            const delta = luma(r, g, b) - luma(or, og, ob);
            or += delta;
            og += delta;
            ob += delta;
          }
        }

        data[p++] = clamp8(Math.round(or));
        data[p++] = clamp8(Math.round(og));
        data[p++] = clamp8(Math.round(ob));
      }
    }
  }
  return { step, data };
}

/**
 * Apply a LUT to RGBA pixel data in place via trilinear interpolation, blending the
 * mapped result back toward the original by `strength`. Alpha is preserved.
 */
export function applyLut(rgba: Uint8ClampedArray, lut: Lut, strength: number): void {
  const { step, data } = lut;
  const N = step - 1;
  const s = strength < 0 ? 0 : strength > 1 ? 1 : strength;
  const inv = 1 - s;

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    const fr = (r / 255) * N;
    const fg = (g / 255) * N;
    const fb = (b / 255) * N;
    const r0 = fr | 0,
      g0 = fg | 0,
      b0 = fb | 0;
    const r1 = r0 < N ? r0 + 1 : r0;
    const g1 = g0 < N ? g0 + 1 : g0;
    const b1 = b0 < N ? b0 + 1 : b0;
    const dr = fr - r0,
      dg = fg - g0,
      db = fb - b0;

    // 8 corner weights
    const w000 = (1 - dr) * (1 - dg) * (1 - db);
    const w001 = (1 - dr) * (1 - dg) * db;
    const w010 = (1 - dr) * dg * (1 - db);
    const w011 = (1 - dr) * dg * db;
    const w100 = dr * (1 - dg) * (1 - db);
    const w101 = dr * (1 - dg) * db;
    const w110 = dr * dg * (1 - db);
    const w111 = dr * dg * db;

    const o000 = ((r0 * step + g0) * step + b0) * 3;
    const o001 = ((r0 * step + g0) * step + b1) * 3;
    const o010 = ((r0 * step + g1) * step + b0) * 3;
    const o011 = ((r0 * step + g1) * step + b1) * 3;
    const o100 = ((r1 * step + g0) * step + b0) * 3;
    const o101 = ((r1 * step + g0) * step + b1) * 3;
    const o110 = ((r1 * step + g1) * step + b0) * 3;
    const o111 = ((r1 * step + g1) * step + b1) * 3;

    const mr =
      data[o000] * w000 + data[o001] * w001 + data[o010] * w010 + data[o011] * w011 +
      data[o100] * w100 + data[o101] * w101 + data[o110] * w110 + data[o111] * w111;
    const mg =
      data[o000 + 1] * w000 + data[o001 + 1] * w001 + data[o010 + 1] * w010 + data[o011 + 1] * w011 +
      data[o100 + 1] * w100 + data[o101 + 1] * w101 + data[o110 + 1] * w110 + data[o111 + 1] * w111;
    const mb =
      data[o000 + 2] * w000 + data[o001 + 2] * w001 + data[o010 + 2] * w010 + data[o011 + 2] * w011 +
      data[o100 + 2] * w100 + data[o101 + 2] * w101 + data[o110 + 2] * w110 + data[o111 + 2] * w111;

    rgba[i] = clamp8(r * inv + mr * s);
    rgba[i + 1] = clamp8(g * inv + mg * s);
    rgba[i + 2] = clamp8(b * inv + mb * s);
    // alpha untouched
  }
}

/** High-level one-shot: recolor RGBA pixel data in place for the given options. */
export function recolor(rgba: Uint8ClampedArray, opts: ConvertOptions): void {
  const lut = buildLut(resolveTargets(opts), opts);
  applyLut(rgba, lut, opts.strength);
}
