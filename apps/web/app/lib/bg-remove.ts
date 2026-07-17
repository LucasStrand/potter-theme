/**
 * Shared contract + mask maths for the background remover (/tools/background-remover).
 *
 * The split: the worker owns the ONNX session and returns a raw 320×320 saliency
 * mask; the component owns compositing. That way the edge sliders re-composite
 * instantly without paying for another inference pass.
 */

/** U-2-Netp is a fixed 320×320 graph — both axes are baked into the ONNX. */
export const MODEL_SIZE = 320;
export const MODEL_URL = "/models/u2netp.onnx";

/** ImageNet normalization, matching the original U-2-Net training transform. */
export const MEAN = [0.485, 0.456, 0.406] as const;
export const STD = [0.229, 0.224, 0.225] as const;

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
