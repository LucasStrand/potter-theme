/**
 * Shared contract + mask maths for the background remover (/tools/background-remover).
 *
 * Two very different images arrive at this tool and they need two different algorithms:
 *
 *   - A photo ("subject" mode). No analytic rule finds the subject, so a saliency model
 *     (U-2-Netp) predicts it. The worker owns the ONNX session and returns a raw 320²
 *     mask; the component composites, so edge sliders never re-run inference.
 *
 *   - A logo, screenshot or studio shot on a flat backdrop ("key" mode). Here a model is
 *     strictly worse: its 320² matte is blobby, smears the background around lettering and
 *     punches holes in thin strokes. Keying every pixel against the measured backdrop
 *     colour is exact, keeps hairlines, and clears enclosed areas (an icon's interior)
 *     that a saliency blob would keep.
 *
 * Which one to use is measured, not guessed — see analyzeBackground.
 */

/** U-2-Netp is a fixed 320×320 graph — both axes are baked into the ONNX. */
export const MODEL_SIZE = 320;
export const MODEL_URL = "/models/u2netp.onnx";

/** ImageNet normalization, matching the original U-2-Net training transform. */
export const MEAN = [0.485, 0.456, 0.406] as const;
export const STD = [0.229, 0.224, 0.225] as const;

export type RGB = [number, number, number];

/** Largest possible redmean distance, used to normalize it to 0..1. */
const REDMEAN_MAX = 806;

/**
 * Perceptual colour distance, normalized to 0..1.
 * Redmean approximates human colour perception far better than raw RGB euclidean
 * distance, which matters when keying anti-aliased edges against a backdrop.
 */
export function colourDistance(r: number, g: number, b: number, t: RGB): number {
  const rmean = (r + t[0]) >> 1;
  const dr = r - t[0];
  const dg = g - t[1];
  const db = b - t[2];
  return (
    Math.sqrt((((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8)) /
    REDMEAN_MAX
  );
}

/**
 * What kind of image arrived:
 *   - "transparent": already cut out. Keying it would be actively destructive — an empty
 *     border ring gives no backdrop colour to measure, and defaulting to black would eat
 *     every black pixel in the subject (a car cutout loses 20% of itself: tyres, windows).
 *   - "flat": a keyable backdrop.
 *   - "photo": needs the saliency model.
 */
export type Kind = "transparent" | "flat" | "photo";

export interface Analysis {
  kind: Kind;
  /** The measured backdrop colour (mean of the opaque border ring). */
  colour: RGB;
  /** Fraction of border pixels already transparent. */
  transparent: number;
  /** Auto-derived key threshold: below this distance a pixel is backdrop. */
  tolerance: number;
}

/** Border pixels within this distance of the ring mean count as "the same colour". */
const SAME_COLOUR = 0.06;
/** Share of the border that must match before we trust a colour key. */
const FLAT_RATIO = 0.9;

/**
 * Decide whether an image sits on a flat backdrop by measuring its border ring.
 *
 * Real photos disagree with themselves at the edges (the car photo scores 17%, a portrait
 * 15%), while a logo on black scores 100% — so the 90% cut has enormous headroom and
 * doesn't need tuning per image.
 */
export function analyzeBackground(rgba: Uint8ClampedArray, w: number, h: number): Analysis {
  const ring: RGB[] = [];
  let transparentCount = 0;
  let total = 0;

  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (rgba[i + 3] < 8) {
      transparentCount++;
      return;
    }
    ring.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  };
  for (let x = 0; x < w; x++) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    sample(0, y);
    sample(w - 1, y);
  }

  const transparent = total ? transparentCount / total : 0;
  // An already-cut-out PNG: nothing to key, nothing to segment. Leave it alone.
  if (transparent >= 0.9 || !ring.length) {
    return { kind: "transparent", colour: [0, 0, 0], transparent, tolerance: 0.04 };
  }

  const colour = [0, 1, 2].map((c) =>
    Math.round(ring.reduce((a, p) => a + p[c], 0) / ring.length),
  ) as RGB;

  const dists = ring.map((p) => colourDistance(p[0], p[1], p[2], colour)).sort((a, b) => a - b);
  const matching = dists.filter((d) => d < SAME_COLOUR).length / dists.length;
  const p99 = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.99))];

  return {
    kind: matching >= FLAT_RATIO ? "flat" : "photo",
    colour,
    transparent,
    // Sit just above the backdrop's own noise, with a floor for perfectly flat fills.
    tolerance: Math.min(0.35, Math.max(0.04, p99 * 1.5 + 0.02)),
  };
}

/** Width of the ramp from "backdrop" to "subject" — the key's soft edge. */
export const KEY_RAMP = 0.1;

export interface WorkerRequest {
  id: number;
  /** RGBA bytes of the image squashed to exactly MODEL_SIZE². */
  buffer: ArrayBuffer;
}

export type WorkerResponse =
  | { id: number; ok: true; mask: ArrayBuffer }
  | { id: number; ok: false; error: string }
  | { id: number; stage: "download" | "init"; progress: number };

export interface EdgeOptions {
  /** Blur applied to the upscaled mask, in output pixels. Softens hard cutouts. */
  softness: number;
  /**
   * Alpha threshold shift, -50..50. Positive eats into the subject (kills the
   * halo of background colour that survives a soft edge); negative keeps more.
   */
  shift: number;
  /** Edge contrast. Higher snaps the matte toward a hard cut. */
  contrast: number;
}

export const DEFAULT_EDGE: EdgeOptions = { softness: 1, shift: 6, contrast: 1.6 };

/**
 * Remap a 0..255 alpha through the edge controls.
 *
 * The model's matte ramps gently across an edge, so a plain threshold either
 * leaves a fringe of the old background or gnaws the subject. Shifting the
 * midpoint and steepening the ramp lets the user tune that trade-off directly.
 */
export function buildAlphaLut({ shift, contrast }: EdgeOptions): Uint8Array {
  const lut = new Uint8Array(256);
  const mid = 0.5 + shift / 100;
  for (let i = 0; i < 256; i++) {
    const v = (i / 255 - mid) * contrast + 0.5;
    lut[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
  }
  return lut;
}
