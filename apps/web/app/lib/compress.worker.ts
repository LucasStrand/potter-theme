/**
 * Off-main-thread encoder for the image compressor.
 *
 * Holds the decoded source and runs the size search from compress.ts against real
 * encoders: the browser's own JPEG/WebP (OffscreenCanvas.convertToBlob) and UPNG for PNG,
 * which can quantize to a palette — the PNG counterpart of turning quality down.
 * A full-size encode takes a few hundred ms, and the search does a dozen or so, so the
 * page would freeze if this ran on the main thread.
 */
import UPNG from "upng-js";
import {
  Cancelled,
  compressToFit,
  GRAPHIC_COVERAGE,
  levelsFor,
  MIME,
  sniffAnimated,
  type Analysis,
  type OutFormat,
  type WorkerRequest,
  type WorkerResponse,
} from "./compress";

const post = (msg: WorkerResponse) => (self as unknown as Worker).postMessage(msg);

let source: { id: number; bitmap: ImageBitmap; analysis: Analysis } | null = null;
/** The newest compress job; anything older stops at its next encode. */
let latestJob = 0;

/**
 * One pass over the pixels: any transparency, the exact colour count up to 256, and how
 * much of the picture its commonest 256 colours cover (sampled — about a million pixels).
 */
function analyze(bitmap: ImageBitmap, animated: boolean): Analysis {
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const px = new Uint32Array(ctx.getImageData(0, 0, width, height).data.buffer);
  let hasAlpha = false;
  for (let i = 0; i < px.length; i++) {
    if (px[i] >>> 24 !== 0xff) {
      hasAlpha = true;
      break;
    }
  }
  const stride = Math.max(1, Math.floor(px.length / 1_000_000));
  const counts = new Map<number, number>();
  let samples = 0;
  for (let i = 0; i < px.length; i += stride) {
    samples++;
    const v = px[i];
    const c = counts.get(v);
    if (c !== undefined) counts.set(v, c + 1);
    // A photo has hundreds of thousands of colours; past 64k the verdict is already in.
    else if (counts.size < 65_536) counts.set(v, 1);
  }
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 256);
  const covered = top.reduce((s, n) => s + n, 0) / samples;
  const flat = stride === 1 ? counts.size <= 256 : false;
  return { width, height, hasAlpha, flat, graphic: flat || covered >= GRAPHIC_COVERAGE, animated };
}

/**
 * Downscale with repeated halving before the last step, so big reductions average
 * every source pixel instead of skipping most of them (which aliases fine detail).
 */
function drawScaled(bitmap: ImageBitmap, w: number, h: number, opaqueOnWhite: boolean): OffscreenCanvas {
  let src: CanvasImageSource = bitmap;
  let sw = bitmap.width;
  let sh = bitmap.height;
  while (sw / 2 >= w && sh / 2 >= h) {
    const nw = Math.max(w, Math.round(sw / 2));
    const nh = Math.max(h, Math.round(sh / 2));
    const step = new OffscreenCanvas(nw, nh);
    const sctx = step.getContext("2d")!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(src, 0, 0, nw, nh);
    src = step;
    sw = nw;
    sh = nh;
  }
  const out = new OffscreenCanvas(w, h);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  if (opaqueOnWhite) {
    // JPEG has no alpha; transparent areas become white rather than black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return out;
}

async function run(id: number, job: number, target: number, format: OutFormat) {
  if (!source || source.id !== id) throw new Error("The image isn't loaded any more — drop it in again.");
  const { bitmap, analysis } = source;

  // The search re-encodes the same size at several levels; draw each size only once.
  let cached: { w: number; h: number; canvas: OffscreenCanvas; rgba?: ArrayBuffer } | null = null;
  const canvasAt = (w: number, h: number) => {
    if (!cached || cached.w !== w || cached.h !== h) {
      const opaqueOnWhite = format === "jpeg" && analysis.hasAlpha;
      cached = { w, h, canvas: drawScaled(bitmap, w, h, opaqueOnWhite) };
    }
    return cached;
  };

  const encode = async (w: number, h: number, level: number): Promise<Blob> => {
    const c = canvasAt(w, h);
    if (format === "png") {
      c.rgba ??= c.canvas.getContext("2d")!.getImageData(0, 0, w, h).data.buffer as ArrayBuffer;
      // UPNG: 0 = lossless (it still picks the tightest colour type), n = quantize to n colours.
      return new Blob([UPNG.encode([c.rgba], w, h, level)], { type: MIME.png });
    }
    const blob = await c.canvas.convertToBlob({ type: MIME[format], quality: level });
    if (blob.type !== MIME[format]) {
      throw new Error(`This browser can't write ${format.toUpperCase()} files — pick another format.`);
    }
    return blob;
  };

  const result = await compressToFit({
    width: analysis.width,
    height: analysis.height,
    target,
    levels: levelsFor(format),
    encode,
    onProgress: (note) => post({ type: "progress", id, job, note }),
    isCancelled: () => job !== latestJob,
  });
  if (job !== latestJob) return;
  post({ type: "done", id, job, format, fit: result.fit, smallest: result.smallest });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "load") {
    latestJob++; // a new image retires whatever was running
    try {
      // GIF frames can sit anywhere in the file; the other formats declare animation up front.
      const end = msg.file.type === "image/gif" ? undefined : 1 << 20;
      const head = new Uint8Array(await msg.file.slice(0, end).arrayBuffer());
      // createImageBitmap applies EXIF orientation, so phone photos come out upright.
      const bitmap = await createImageBitmap(msg.file);
      source?.bitmap.close();
      source = { id: msg.id, bitmap, analysis: analyze(bitmap, sniffAnimated(head)) };
      post({ type: "loaded", id: msg.id, analysis: source.analysis });
    } catch {
      post({ type: "error", id: msg.id, message: "Couldn't read that image — this browser can't decode its format." });
    }
    return;
  }
  latestJob = msg.job;
  try {
    await run(msg.id, msg.job, msg.target, msg.format);
  } catch (err) {
    if (err instanceof Cancelled) return;
    post({ type: "error", id: msg.id, job: msg.job, message: (err as Error).message || "Compression failed." });
  }
};
