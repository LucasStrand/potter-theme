"use client";
// Background remover (/tools/background-remover).
// Drop in an image, get the subject cut out on transparency. Two engines sit behind one
// button: a flat backdrop (logo, screenshot, studio shot) is keyed exactly, a photo goes to
// a U-2-Netp saliency model in a worker. The right one is chosen by measuring the image —
// see analyzeBackground — so the defaults are usually the finished answer.
// Nothing is uploaded: the model comes to the image, not the other way round.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlavorSwitch } from "./flavor-switch";
import {
  analyzeBackground,
  buildAlphaLut,
  colourDistance,
  DEFAULT_EDGE,
  KEY_RAMP,
  MODEL_SIZE,
  type Analysis,
  type EdgeOptions,
  type WorkerResponse,
} from "../lib/bg-remove";

type Backdrop = "transparent" | "white" | "black" | "accent" | "custom";
type Phase = "idle" | "loading" | "working" | "done" | "error";
type Mode = "auto" | "key" | "subject";

const BACKDROP_HEX: Record<"white" | "black", string> = {
  white: "#ffffff",
  black: "#000000",
};

/** Read the live accent so the "accent" backdrop follows the active flavor. */
function accentHex(): string {
  if (typeof window === "undefined") return "#e08a6a";
  const css = getComputedStyle(document.documentElement);
  const v = css.getPropertyValue("--site-accent") || css.getPropertyValue("--potter-peach");
  return v.trim() || "#e08a6a";
}

export function BackgroundRemover() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [edge, setEdge] = useState<EdgeOptions>(DEFAULT_EDGE);
  const [tolerance, setTolerance] = useState(0.04);
  const [backdrop, setBackdrop] = useState<Backdrop>("transparent");
  const [customBg, setCustomBg] = useState("#1c1812");
  const [showOriginal, setShowOriginal] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [name, setName] = useState("cutout");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  // Kept across re-composites so control tweaks never redo the expensive work.
  const sourceRef = useRef<ImageBitmap | null>(null);
  const maskRef = useRef<Uint8ClampedArray | null>(null);
  /** Per-pixel distance from the backdrop colour, quantized to 0..255. */
  const distRef = useRef<Uint8Array | null>(null);

  const resolved: Exclude<Mode, "auto"> =
    mode === "auto" ? (analysis?.kind === "photo" ? "subject" : "key") : mode;
  /** An already-cut-out image is left exactly as it came in. */
  const passthrough = mode === "auto" && analysis?.kind === "transparent";

  useEffect(() => {
    const w = new Worker(new URL("../lib/bg-remove.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  /** Hand the 320² frame to the model. Only needed in subject mode. */
  const runModel = useCallback((bitmap: ImageBitmap) => {
    const small = document.createElement("canvas");
    small.width = MODEL_SIZE;
    small.height = MODEL_SIZE;
    const sctx = small.getContext("2d", { willReadFrequently: true })!;
    sctx.imageSmoothingQuality = "high";
    // Squash to the model's fixed input. Aspect distortion is what U-2-Net was
    // trained on, so this is faithful rather than sloppy.
    sctx.drawImage(bitmap, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = sctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

    const worker = workerRef.current;
    if (!worker) return;
    const id = ++reqId.current;
    setPhase("working");
    const buffer = new Uint8ClampedArray(rgba).buffer;
    worker.postMessage({ id, buffer }, [buffer]);
  }, []);

  const composite = useCallback(() => {
    const src = sourceRef.current;
    const canvas = canvasRef.current;
    if (!src || !canvas) return;

    const { width: w, height: h } = src;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0);
    const frame = ctx.getImageData(0, 0, w, h);
    const n = w * h;

    if (passthrough) {
      // Already transparent: the source alpha IS the answer, leave it untouched.
    } else if (resolved === "key") {
      // Usually precomputed at intake, but a photo forced into key mode by hand has
      // no distance field yet — build it from the frame we just read.
      let dist = distRef.current;
      if (!dist) {
        const colour = analysis?.colour ?? [0, 0, 0];
        dist = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          dist[i] = Math.round(
            Math.min(1, colourDistance(frame.data[i * 4], frame.data[i * 4 + 1], frame.data[i * 4 + 2], colour)) * 255,
          );
        }
        distRef.current = dist;
      }
      // Ramp from backdrop (transparent) to subject (opaque). Multiplying by the
      // source alpha preserves transparency an image already had.
      const lo = tolerance * 255;
      const hi = Math.min(255, (tolerance + KEY_RAMP) * 255);
      for (let i = 0; i < n; i++) {
        const d = dist[i];
        const a = d <= lo ? 0 : d >= hi ? 1 : (d - lo) / (hi - lo);
        frame.data[i * 4 + 3] = Math.round(a * frame.data[i * 4 + 3]);
      }
    } else {
      const mask = maskRef.current;
      if (!mask) return;
      // Upscale the 320² matte with smoothing — that interpolation is what keeps a
      // full-resolution edge from staircasing.
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = MODEL_SIZE;
      maskCanvas.height = MODEL_SIZE;
      const mctx = maskCanvas.getContext("2d")!;
      const img = mctx.createImageData(MODEL_SIZE, MODEL_SIZE);
      for (let i = 0; i < mask.length; i++) {
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = mask[i];
        img.data[i * 4 + 3] = 255;
      }
      mctx.putImageData(img, 0, 0);

      const up = document.createElement("canvas");
      up.width = w;
      up.height = h;
      const uctx = up.getContext("2d", { willReadFrequently: true })!;
      uctx.imageSmoothingEnabled = true;
      uctx.imageSmoothingQuality = "high";
      if (edge.softness > 0) uctx.filter = `blur(${edge.softness}px)`;
      uctx.drawImage(maskCanvas, 0, 0, w, h);
      uctx.filter = "none";
      const upMask = uctx.getImageData(0, 0, w, h).data;

      const lut = buildAlphaLut(edge);
      for (let i = 0; i < n; i++) frame.data[i * 4 + 3] = lut[upMask[i * 4]];
    }

    ctx.putImageData(frame, 0, 0);

    if (backdrop !== "transparent") {
      const hex =
        backdrop === "accent" ? accentHex() : backdrop === "custom" ? customBg : BACKDROP_HEX[backdrop];
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }
  }, [resolved, passthrough, tolerance, edge, backdrop, customBg, analysis]);

  // Re-composite whenever a control moves (cheap: no inference, no distance pass).
  useEffect(() => {
    if (phase === "done" && !showOriginal) composite();
  }, [composite, phase, showOriginal]);

  // Switching to subject mode on an image we keyed means the model hasn't run yet.
  useEffect(() => {
    if (resolved !== "subject" || maskRef.current || !sourceRef.current) return;
    if (phase === "done" || phase === "error") runModel(sourceRef.current);
  }, [resolved, phase, runModel]);

  // Toggling the before/after view repaints straight from the source bitmap.
  useEffect(() => {
    if (phase !== "done" || !showOriginal) return;
    const src = sourceRef.current;
    const canvas = canvasRef.current;
    if (!src || !canvas) return;
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);
  }, [showOriginal, phase]);

  const intake = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("That's not an image — try a PNG, JPG or WebP.");
        setPhase("error");
        return;
      }
      setError(null);
      setPhase("loading");
      setProgress(0);
      setShowOriginal(false);
      setMode("auto");
      setEdge(DEFAULT_EDGE);
      maskRef.current = null;
      setName(file.name.replace(/\.[^.]+$/, "") || "cutout");

      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        setError("Couldn't decode that image.");
        setPhase("error");
        return;
      }
      sourceRef.current?.close();
      sourceRef.current = bitmap;
      const { width: w, height: h } = bitmap;
      setDims({ w, h });

      // Read the image once at full resolution: the border ring decides the engine,
      // and the distance field powers the key without a second pass per slider tick.
      const full = document.createElement("canvas");
      full.width = w;
      full.height = h;
      const fctx = full.getContext("2d", { willReadFrequently: true })!;
      fctx.drawImage(bitmap, 0, 0);
      const rgba = fctx.getImageData(0, 0, w, h).data;

      const found = analyzeBackground(rgba, w, h);
      setAnalysis(found);

      if (found.kind === "transparent") {
        distRef.current = null;
        setTolerance(found.tolerance);
        setPhase("done"); // nothing to remove
        return;
      }

      if (found.kind === "flat") {
        setTolerance(found.tolerance);
        const dist = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          dist[i] = Math.round(
            Math.min(1, colourDistance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], found.colour)) * 255,
          );
        }
        distRef.current = dist;
        setPhase("done"); // keyed analytically — the model never has to load
        return;
      }

      distRef.current = null;
      runModel(bitmap);
    },
    [runModel],
  );

  // Route worker replies. Stale ids are dropped so a fast second drop always wins.
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.id !== reqId.current) return;
      if ("stage" in msg) {
        setPhase("loading");
        setProgress(msg.stage === "download" ? msg.progress : 1);
        return;
      }
      if (msg.ok) {
        maskRef.current = new Uint8ClampedArray(msg.mask);
        setPhase("done");
      } else {
        setError(msg.error);
        setPhase("error");
      }
    };
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, []);

  // Paste an image straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? [])[0];
      if (file) intake(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [intake]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "done") return;
    if (showOriginal) setShowOriginal(false);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-cutout.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [name, phase, showOriginal]);

  const busy = phase === "loading" || phase === "working";
  const status =
    phase === "loading"
      ? progress > 0 && progress < 1
        ? `Fetching the model — ${Math.round(progress * 100)}%`
        : "Reading the image…"
      : phase === "working"
        ? "Finding the subject…"
        : null;

  const verdict =
    phase === "done" && analysis
      ? passthrough
        ? "Already transparent — nothing to remove"
        : resolved === "key"
          ? `Flat backdrop detected — keyed against rgb(${analysis.colour.join(", ")})`
          : "Photo detected — subject picked out by the model"
      : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--potter-subtext1)" }}>
            <Link href="/tools" className="transition-opacity hover:opacity-70">Tools</Link>
            <FlavorSwitch size="sm" />
          </div>
        </div>

        <header className="mt-10 sm:mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            background remover
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Keep the subject, lose the rest
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Drop a photo or a logo in and the background falls away — full resolution, real transparency,
            and not a single byte leaves your machine. It reads the image first and picks the right method
            on its own.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* preview */}
          <div>
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) intake(f);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              className="relative flex items-center justify-center overflow-auto rounded-2xl p-4"
              style={{
                minHeight: 380,
                border: dragging
                  ? "2px dashed var(--site-accent, var(--potter-peach))"
                  : "1px solid var(--potter-surface0)",
                backgroundColor: "#cfcfcf",
                backgroundImage:
                  "linear-gradient(45deg,#9a9a9a 25%,transparent 25%),linear-gradient(-45deg,#9a9a9a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#9a9a9a 75%),linear-gradient(-45deg,transparent 75%,#9a9a9a 75%)",
                backgroundSize: "22px 22px",
                backgroundPosition: "0 0,0 11px,11px -11px,-11px 0",
              }}
            >
              {phase === "idle" ? (
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl px-8 py-10 text-center">
                  <span className="font-display text-xl" style={{ color: "#2a2a2a" }}>
                    Drop an image here
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "#4a4a4a" }}>
                    or click to browse · or paste
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) intake(f);
                    }}
                  />
                </label>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="block h-auto max-w-full"
                  style={{ maxHeight: 560, boxShadow: "0 8px 40px -12px rgba(0,0,0,.5)" }}
                />
              )}

              {busy && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.72)" }}
                >
                  <div className="h-1 w-48 overflow-hidden rounded-full" style={{ background: "var(--potter-surface1)" }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{
                        width: phase === "working" ? "100%" : `${Math.max(4, progress * 100)}%`,
                        background: "var(--site-accent, var(--potter-peach))",
                        opacity: phase === "working" ? 0.6 : 1,
                      }}
                    />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-subtext1)" }}>
                    {status}
                  </p>
                </div>
              )}

              {error && (
                <p
                  className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-center text-sm"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.85)", color: "var(--potter-red)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
              {dims.w > 0
                ? `checkerboard = transparent · ${dims.w}×${dims.h}px · runs locally, nothing uploaded`
                : "checkerboard = transparent · runs locally, nothing uploaded"}
            </p>
          </div>

          {/* controls */}
          <aside className="space-y-6">
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex gap-1.5">
                <label
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) intake(f);
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowOriginal((s) => !s)}
                  disabled={phase !== "done"}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-subtext1)" }}
                >
                  {showOriginal ? "Cutout" : "Before"}
                </button>
              </div>
              {verdict && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
                  {verdict}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Method</Label>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={mode === "auto"} onClick={() => setMode("auto")}>Auto</Pill>
                <Pill active={mode === "key"} onClick={() => setMode("key")}>Flat backdrop</Pill>
                <Pill active={mode === "subject"} onClick={() => setMode("subject")}>Photo subject</Pill>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Backdrop</Label>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={backdrop === "transparent"} onClick={() => setBackdrop("transparent")}>None</Pill>
                <Pill active={backdrop === "white"} onClick={() => setBackdrop("white")}>White</Pill>
                <Pill active={backdrop === "black"} onClick={() => setBackdrop("black")}>Black</Pill>
                <Pill active={backdrop === "accent"} onClick={() => setBackdrop("accent")}>Accent</Pill>
                <Pill active={backdrop === "custom"} onClick={() => setBackdrop("custom")}>Custom</Pill>
              </div>
              {backdrop === "custom" && (
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  aria-label="Custom backdrop colour"
                />
              )}
            </div>

            {passthrough ? null : resolved === "key" ? (
              <div className="space-y-3">
                <Label>Edge</Label>
                <Slider
                  label="Tolerance"
                  hint="how close to the backdrop colour still counts as background"
                  min={0.01}
                  max={0.35}
                  step={0.005}
                  value={tolerance}
                  onChange={setTolerance}
                />
                <button
                  onClick={() => analysis && setTolerance(analysis.tolerance)}
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Reset to auto
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Edge</Label>
                <Slider
                  label="Tightness"
                  hint="trims background haloes"
                  min={-20}
                  max={30}
                  step={1}
                  value={edge.shift}
                  onChange={(shift) => setEdge((e) => ({ ...e, shift }))}
                />
                <Slider
                  label="Softness"
                  hint="feathers the cut"
                  min={0}
                  max={6}
                  step={0.5}
                  value={edge.softness}
                  onChange={(softness) => setEdge((e) => ({ ...e, softness }))}
                />
                <Slider
                  label="Hardness"
                  hint="snaps edges crisp"
                  min={1}
                  max={6}
                  step={0.1}
                  value={edge.contrast}
                  onChange={(contrast) => setEdge((e) => ({ ...e, contrast }))}
                />
                <button
                  onClick={() => setEdge(DEFAULT_EDGE)}
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Reset edge
                </button>
              </div>
            )}

            <button
              onClick={download}
              disabled={phase !== "done"}
              className="w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
            >
              Download PNG
            </button>

            <p className="text-xs leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
              Logos and flat backdrops are keyed exactly — no model needed. Photos use U-2-Netp
              (Apache-2.0) via ONNX Runtime Web; that 4.5MB model downloads once, then your browser
              caches it.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-overlay2)" }}>
      {children}
    </p>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--site-accent, var(--potter-peach))" : "var(--potter-surface0)",
        color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
      }}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm" style={{ color: "var(--potter-subtext1)" }}>{label}</span>
        <span className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
          {step < 1 ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full cursor-pointer"
        style={{ accentColor: "var(--site-accent, var(--potter-peach))" }}
        aria-label={`${label} — ${hint}`}
      />
      <p className="font-mono text-[10px]" style={{ color: "var(--potter-overlay2)" }}>{hint}</p>
    </div>
  );
}
