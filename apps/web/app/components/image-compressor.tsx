"use client";
// Image compressor (/tools/image-compressor).
// Drop an image, say how big the file may be, get a file under that size. Nothing is
// cropped and the shape never changes: quality gives way first, pixels only after —
// see compress.ts for the order. The encoding runs in a worker; the original, and any
// file you download, are kept in Potter's file storage.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlavorSwitch } from "./flavor-switch";
import {
  EXT,
  FORMAT_LABEL,
  formatBytes,
  MIME,
  pickFormat,
  targetBytes,
  type Analysis,
  type CompressDone,
  type FormatChoice,
  type WorkerResponse,
} from "../lib/compress";
import { saveToolFile } from "../lib/tool-files";

type Phase = "idle" | "loading" | "working" | "done" | "error";
type Unit = "KB" | "MB";

const PRESETS: { value: number; unit: Unit }[] = [
  { value: 500, unit: "KB" },
  { value: 1, unit: "MB" },
  { value: 2, unit: "MB" },
  { value: 5, unit: "MB" },
  { value: 10, unit: "MB" },
  { value: 25, unit: "MB" },
];

type Source = { file: File; url: string; analysis: Analysis | null };
type Result = { done: CompressDone; url: string; target: number };

export function ImageCompressor() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  /** A dropped file that isn't an image: said once, and the current result stays as it was. */
  const [rejected, setRejected] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("MB");
  const [choice, setChoice] = useState<FormatChoice>("auto");
  const [source, setSource] = useState<Source | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const loadId = useRef(0);
  const jobId = useRef(0);
  const targetRef = useRef(0);

  const value = parseFloat(amount.replace(",", "."));
  const target = Number.isFinite(value) && value > 0 ? targetBytes(value, unit) : 0;
  const busy = phase === "loading" || phase === "working";

  const replaceResult = useCallback((next: Result | null) => {
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return next;
    });
  }, []);

  useEffect(() => {
    const w = new Worker(new URL("../lib/compress.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.id !== loadId.current) return;
      if (msg.type === "loaded") {
        setSource((s) => (s ? { ...s, analysis: msg.analysis } : s));
      } else if (msg.type === "progress") {
        if (msg.job === jobId.current) setStatus(msg.note);
      } else if (msg.type === "done") {
        if (msg.job !== jobId.current) return;
        const out = msg.fit ?? msg.smallest;
        replaceResult({ done: msg, url: URL.createObjectURL(out.blob), target: targetRef.current });
        setPhase("done");
      } else if (msg.type === "error") {
        if (msg.job !== undefined && msg.job !== jobId.current) return;
        setError(msg.message);
        setPhase("error");
      }
    };
    return () => w.terminate();
  }, [replaceResult]);

  const intake = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        setRejected(
          file.type === "image/svg+xml"
            ? "SVGs are drawings, not pixels — there's nothing to compress. The SVG → PNG tool turns one into a picture."
            : "That's not an image — try a JPG, PNG, WebP or GIF.",
        );
        return;
      }
      setRejected(null);
      void saveToolFile("image-compressor", file);
      const id = ++loadId.current;
      setError(null);
      setShowOriginal(false);
      replaceResult(null);
      setSource((s) => {
        if (s) URL.revokeObjectURL(s.url);
        return { file, url: URL.createObjectURL(file), analysis: null };
      });
      setStatus("Reading the image");
      setPhase("loading");
      workerRef.current?.postMessage({ type: "load", id, file });
    },
    [replaceResult],
  );

  // Paste an image straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (f) intake(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [intake]);

  // (Re)compress whenever the image, the target or the format changes. Typing a target
  // fires a burst of changes, so wait a beat before starting.
  const analysis = source?.analysis ?? null;
  const format = analysis ? pickFormat(choice, analysis) : "jpeg";
  useEffect(() => {
    if (!source || !analysis || target <= 0) return;
    // Already small enough: hand the original back untouched instead of re-encoding it.
    if (source.file.size <= target) {
      jobId.current++;
      replaceResult(null);
      setError(null);
      setPhase("done");
      return;
    }
    const t = setTimeout(() => {
      const job = ++jobId.current;
      targetRef.current = target;
      setError(null);
      setStatus("Starting");
      setPhase("working");
      workerRef.current?.postMessage({ type: "compress", id: loadId.current, job, target, format });
    }, 350);
    return () => clearTimeout(t);
  }, [source, analysis, target, format, replaceResult]);

  const untouched = phase === "done" && !result && source !== null;
  const out = result ? (result.done.fit ?? result.done.smallest) : null;
  const missed = result !== null && result.done.fit === null;
  const baseName = source?.file.name.replace(/\.[^.]+$/, "") || "image";

  const download = () => {
    if (!source) return;
    let file: File;
    if (untouched) {
      file = source.file;
    } else if (result && out) {
      const label = `${amount.trim().replace(",", ".")}${unit}`;
      const fmt = result.done.format;
      file = new File([out.blob], `${baseName}-${label}.${EXT[fmt]}`, { type: MIME[fmt] });
      void saveToolFile("image-compressor", file);
    } else {
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  };

  const steps: string[] = [];
  if (untouched && source) {
    steps.push(`Already ${formatBytes(source.file.size)} — under the target, so it's left exactly as it was.`);
  } else if (result && out && analysis) {
    const fmt = result.done.format;
    steps.push("Metadata dropped (camera info, thumbnails, colour profile).");
    if (fmt === "png") {
      steps.push(out.level === 0 ? "PNG kept lossless — every pixel exact." : `PNG reduced to a ${out.level}-colour palette.`);
    } else {
      steps.push(`${FORMAT_LABEL[fmt]} quality ${Math.round(out.level * 100)}%.`);
    }
    steps.push(
      out.width === analysis.width
        ? `Full ${analysis.width}×${analysis.height} kept — nothing scaled, nothing cropped.`
        : `Scaled evenly to ${out.width}×${out.height} (${percent(out.width / analysis.width)}) — same shape, nothing cropped.`,
    );
    if (analysis.animated) steps.push("Animated image: only the first frame is kept.");
    if (fmt === "jpeg" && analysis.hasAlpha) steps.push("JPEG has no transparency, so see-through areas became white.");
  }

  const previewUrl = showOriginal || !result ? source?.url : result.url;

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
            image compressor
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Under the limit, nothing cut
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Drop an image and say how big the file may be. Quality gives way first; the picture only gets
            smaller once that runs out — and then evenly, so the shape stays and nothing is cropped.
            Images you drop in, and the files you download, are kept in Potter&apos;s file storage.
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
              className="relative flex items-center justify-center overflow-hidden rounded-2xl p-4"
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
              {!previewUrl ? (
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
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote asset
                <img
                  src={previewUrl}
                  alt={showOriginal ? "Original image" : "Compressed image"}
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
                    <div className="h-full w-full animate-pulse rounded-full" style={{ background: "var(--site-accent, var(--potter-peach))" }} />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-subtext1)" }}>
                    {status}
                  </p>
                </div>
              )}

              {(error || rejected) && (
                <p
                  className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-center text-sm"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.85)", color: "var(--potter-red)" }}
                >
                  {error ?? rejected}
                </p>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
              {source && analysis
                ? `showing ${showOriginal || !result ? "original" : "result"} · original ${analysis.width}×${analysis.height}px, ${formatBytes(source.file.size)} · runs locally`
                : "checkerboard = transparent · runs locally"}
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
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowOriginal((s) => !s)}
                  disabled={!result}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-subtext1)" }}
                >
                  {showOriginal ? "Result" : "Before"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max file size</Label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Maximum file size"
                  className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                />
                <Pill active={unit === "KB"} onClick={() => setUnit("KB")}>KB</Pill>
                <Pill active={unit === "MB"} onClick={() => setUnit("MB")}>MB</Pill>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Pill
                    key={`${p.value}${p.unit}`}
                    active={value === p.value && unit === p.unit}
                    onClick={() => {
                      setAmount(String(p.value));
                      setUnit(p.unit);
                    }}
                  >
                    {p.value} {p.unit}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={choice === "auto"} onClick={() => setChoice("auto")}>Auto</Pill>
                <Pill active={choice === "jpeg"} onClick={() => setChoice("jpeg")}>JPEG</Pill>
                <Pill active={choice === "webp"} onClick={() => setChoice("webp")}>WebP</Pill>
                <Pill active={choice === "png"} onClick={() => setChoice("png")}>PNG</Pill>
              </div>
              {choice === "auto" && analysis && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
                  {analysis.hasAlpha
                    ? "Has transparency — PNG keeps it."
                    : analysis.flat
                      ? "Flat colours — a palette PNG holds them exactly."
                      : analysis.graphic
                        ? "A graphic (logo, screenshot, text) — PNG keeps the edges crisp."
                        : "Photo or painting — JPEG suits it best."}
                </p>
              )}
            </div>

            {(out || untouched) && source && (
              <div className="space-y-2 rounded-xl p-4" style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}>
                <p className="font-display text-2xl font-semibold" style={{ color: missed ? "var(--potter-red)" : "var(--potter-text)" }}>
                  {formatBytes(out ? out.blob.size : source.file.size)}
                  <span className="ml-2 font-mono text-xs font-normal" style={{ color: "var(--potter-overlay2)" }}>
                    from {formatBytes(source.file.size)}
                  </span>
                </p>
                {missed && out && result && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--potter-red)" }}>
                    Can&apos;t get under {formatBytes(result.target)} — even at {out.width}×{out.height} this format
                    needs {formatBytes(out.blob.size)}. This is the smallest it goes.
                  </p>
                )}
                <ul className="space-y-1 text-xs leading-relaxed" style={{ color: "var(--potter-subtext0)" }}>
                  {steps.map((s) => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={download}
              disabled={phase !== "done"}
              className="w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
            >
              Download {untouched ? "original" : FORMAT_LABEL[result?.done.format ?? format]}
            </button>

            <p className="text-xs leading-relaxed" style={{ color: "var(--potter-overlay2)" }}>
              1 MB here is 1,000,000 bytes, so the file fits limits written either way. Quality stops at 60%
              (or a 64-colour palette for PNG) — past that, a slightly smaller picture looks better than a
              blockier one, so the size gives way instead.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function percent(f: number): string {
  return f < 0.01 ? "<1%" : `${Math.round(f * 100)}%`;
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
