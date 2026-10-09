/**
 * Shared contract + search rules for the image compressor (/tools/image-compressor).
 *
 * The job: get an image under a file-size target without anyone deciding what to cut.
 * The picture is never cropped and always keeps its aspect ratio. What gives way, in order:
 *   1. metadata — any re-encode drops EXIF, colour profiles and thumbnails;
 *   2. encoding quality — JPEG/WebP quality, or the PNG palette, down to a floor;
 *   3. pixel dimensions — only once quality sits at its floor, scaled evenly on both axes,
 *      then quality is pushed back up as far as the smaller size allows.
 * The encoders live in compress.worker.ts; the search below only sees "encode at w×h, level".
 */

export type OutFormat = "jpeg" | "webp" | "png";
export type FormatChoice = "auto" | OutFormat;

export const MIME: Record<OutFormat, string> = { jpeg: "image/jpeg", webp: "image/webp", png: "image/png" };
export const EXT: Record<OutFormat, string> = { jpeg: "jpg", webp: "webp", png: "png" };
export const FORMAT_LABEL: Record<OutFormat, string> = { jpeg: "JPEG", webp: "WebP", png: "PNG" };

/** Lossy quality, best first: 0.98 down to the 0.60 floor. Below that, shrinking looks better. */
const LOSSY_LEVELS = Array.from({ length: 20 }, (_, i) => Math.round((0.98 - i * 0.02) * 100) / 100);
/** PNG, best first: 0 = lossless, otherwise the palette size UPNG quantizes to. */
const PNG_LEVELS = [0, 256, 128, 64];

export function levelsFor(format: OutFormat): number[] {
  return format === "png" ? PNG_LEVELS : LOSSY_LEVELS;
}

/** The long side never drops below this; a target that needs smaller can't be met. */
export const MIN_LONG_SIDE = 16;

export type Analysis = {
  width: number;
  height: number;
  /** Any pixel not fully opaque. */
  hasAlpha: boolean;
  /** 256 colours or fewer — pixel art, flat UI. A palette PNG holds these exactly. */
  flat: boolean;
  /**
   * Mostly flat: the 256 commonest colours cover ≥ 95% of the pixels — logos, screenshots,
   * diagrams, whose anti-aliased edges add colours but no real tone. JPEG smears these.
   */
  graphic: boolean;
  /** Animated GIF/APNG/WebP: only the first frame survives a canvas. */
  animated: boolean;
};

/** Auto: PNG for transparency and graphics (crisp edges, palette-friendly), JPEG for the rest. */
export function pickFormat(choice: FormatChoice, a: Pick<Analysis, "hasAlpha" | "graphic">): OutFormat {
  if (choice !== "auto") return choice;
  return a.hasAlpha || a.graphic ? "png" : "jpeg";
}

/** Share of samples covered by the 256 commonest colours that makes an image a graphic. */
export const GRAPHIC_COVERAGE = 0.95;

export type Attempt = { blob: Blob; width: number; height: number; level: number };

export type Encode = (width: number, height: number, level: number) => Promise<Blob>;

/** Even scaling — both sides by the same factor, never below 1px. */
export function dimsAt(width: number, height: number, scale: number): { w: number; h: number } {
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

export class Cancelled extends Error {}

/**
 * Best level that fits at a fixed size, given that `floor` (the last level) already does.
 * Sizes fall as the level index rises, so this is a bisection over the index — with the
 * best level tried first, since a roomy target often takes it outright.
 */
async function bestLevel(
  levels: number[],
  floor: Attempt,
  target: number,
  encode: Encode,
  isCancelled: () => boolean,
): Promise<Attempt> {
  const { width: w, height: h } = floor;
  let best = floor;
  let lo = -1; // highest index known too big (-1: none tried yet)
  let hi = levels.length - 1; // lowest index known to fit
  while (hi - lo > 1) {
    if (isCancelled()) throw new Cancelled();
    const mid = lo === -1 && hi === levels.length - 1 ? 0 : Math.floor((lo + hi) / 2);
    const blob = await encode(w, h, levels[mid]);
    if (blob.size <= target) {
      hi = mid;
      best = { blob, width: w, height: h, level: levels[mid] };
    } else {
      lo = mid;
    }
  }
  return best;
}

export type FitResult = {
  /** The best file under target, or null when even the smallest size overshoots. */
  fit: Attempt | null;
  /** The smallest file the search produced — what to offer when nothing fits. */
  smallest: Attempt;
};

/**
 * Find the largest image, at the best quality, whose encoded size is ≤ target.
 * Order is the contract: full size first (quality down to floor), only then smaller.
 */
export async function compressToFit(opts: {
  width: number;
  height: number;
  target: number;
  levels: number[];
  encode: Encode;
  onProgress?: (note: string) => void;
  isCancelled?: () => boolean;
}): Promise<FitResult> {
  const { width, height, target, levels, encode } = opts;
  const note = opts.onProgress ?? (() => {});
  const isCancelled = opts.isCancelled ?? (() => false);
  const floorLevel = levels[levels.length - 1];

  const attemptAt = async (w: number, h: number): Promise<Attempt> => {
    if (isCancelled()) throw new Cancelled();
    return { blob: await encode(w, h, floorLevel), width: w, height: h, level: floorLevel };
  };

  // 1 — full size, lowest acceptable quality. If that fits, only quality needs tuning.
  note(`Trying full size ${width}×${height}`);
  const fullFloor = await attemptAt(width, height);
  let smallest = fullFloor;
  if (fullFloor.blob.size <= target) {
    note("Full size fits — tuning quality");
    return { fit: await bestLevel(levels, fullFloor, target, encode, isCancelled), smallest };
  }

  // 2 — quality is spent; shrink evenly. Bisect the scale for the largest size that fits
  // at the floor quality. File size falls a little slower than pixel count, so the
  // square-root estimate is a good first probe that usually lands just over.
  const longSide = Math.max(width, height);
  const minScale = Math.min(1, MIN_LONG_SIDE / longSide);
  let lo = 0; // largest scale known to fit (0: none yet)
  let hi = 1; // smallest scale known not to fit
  let fitAtFloor: Attempt | null = null;
  let probe = Math.max(minScale, Math.min(0.99, Math.sqrt(target / fullFloor.blob.size) * 0.98));
  for (let i = 0; i < 16; i++) {
    const { w, h } = dimsAt(width, height, probe);
    note(`Scaling to ${w}×${h}`);
    const a = await attemptAt(w, h);
    if (a.blob.size < smallest.blob.size) smallest = a;
    if (a.blob.size <= target) {
      lo = probe;
      fitAtFloor = a;
    } else {
      hi = probe;
      if (probe <= minScale) break; // already at the smallest size allowed
    }
    // Done once the bracket is within a few pixels on the long side.
    if (fitAtFloor && (hi - lo) * longSide < 4) break;
    probe = fitAtFloor ? (lo + hi) / 2 : Math.max(minScale, hi * 0.7);
  }
  if (!fitAtFloor) return { fit: null, smallest };

  // 3 — at the chosen size, hand back any quality the budget still allows.
  note(`${fitAtFloor.width}×${fitAtFloor.height} fits — tuning quality`);
  return { fit: await bestLevel(levels, fitAtFloor, target, encode, isCancelled), smallest };
}

/** Animated GIF / APNG / animated WebP, read straight from the file's bytes. */
export function sniffAnimated(bytes: Uint8Array): boolean {
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) if (bytes[at + i] !== s.charCodeAt(i)) return false;
    return true;
  };
  if (ascii(0, "GIF8")) {
    // More than one Graphic Control Extension (21 F9 04) means more than one frame.
    let frames = 0;
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04 && ++frames > 1) return true;
    }
    return false;
  }
  if (bytes[0] === 0x89 && ascii(1, "PNG")) {
    // acTL must come before the first IDAT, so the head of the file is enough.
    const end = Math.min(bytes.length - 4, 1 << 20);
    for (let i = 8; i < end; i++) if (ascii(i, "acTL")) return true;
    return false;
  }
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) {
    const end = Math.min(bytes.length - 4, 4096);
    for (let i = 12; i < end; i++) if (ascii(i, "ANIM")) return true;
  }
  return false;
}

/** 1 MB = 1,000,000 bytes, so the file is under limits written either way (MB or MiB). */
export function targetBytes(value: number, unit: "KB" | "MB"): number {
  return Math.floor(value * (unit === "MB" ? 1_000_000 : 1_000));
}

export function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)} KB`;
  return `${n} B`;
}

export type WorkerRequest =
  | { type: "load"; id: number; file: Blob }
  | { type: "compress"; id: number; job: number; target: number; format: OutFormat };

export type CompressDone = {
  type: "done";
  id: number;
  job: number;
  format: OutFormat;
  /** null when even the smallest size overshoots; `smallest` is then the closest it got. */
  fit: Attempt | null;
  smallest: Attempt;
};

export type WorkerResponse =
  | { type: "loaded"; id: number; analysis: Analysis }
  | { type: "progress"; id: number; job: number; note: string }
  | CompressDone
  | { type: "error"; id: number; job?: number; message: string };
