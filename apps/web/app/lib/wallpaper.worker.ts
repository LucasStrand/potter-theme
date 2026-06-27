/**
 * Off-main-thread runner for the wallpaper converter. Builds the LUT and applies it to
 * the transferred RGBA buffer, then transfers the result back so slider drags and large
 * images never block the UI. The component falls back to the synchronous core if Workers
 * are unavailable.
 */
import { buildLut, applyLut, resolveTargets, type ConvertOptions } from "./wallpaper";

export interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  opts: ConvertOptions;
}

export interface WorkerResponse {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, width, height, opts } = e.data;
  const rgba = new Uint8ClampedArray(buffer);
  const lut = buildLut(resolveTargets(opts), opts);
  applyLut(rgba, lut, opts.strength);
  const res: WorkerResponse = { id, buffer, width, height };
  (self as unknown as Worker).postMessage(res, [buffer]);
};
