"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFlavor, FLAVORS, FLAVOR_LABEL, type Flavor } from "../flavor-provider";
import { recolor, type ConvertOptions, type Mode } from "../lib/wallpaper";
import type { WorkerRequest, WorkerResponse } from "../lib/wallpaper.worker";

const MAX_PREVIEW = 1400; // longest side for the live preview
const MAX_FULL = 3840; // longest side for the downloaded image

export function WallpaperConverter() {
  const { flavor: globalFlavor } = useFlavor();
  const [flavor, setFlavor] = useState<Flavor>(globalFlavor);
  const [mode, setMode] = useState<Mode>("smooth");
  const [strength, setStrength] = useState(1);
  const [softness, setSoftness] = useState(0.45);
  const [preserveLuminance, setPreserveLuminance] = useState(true);

  const [hasImage, setHasImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [divider, setDivider] = useState(50);
  const [fileName, setFileName] = useState("sample");
  const [dragging, setDragging] = useState(false);
  const [aspect, setAspect] = useState(16 / 9); // preview box tracks the image exactly (no letterbox)

  // follow the global flavor switch unless the user picks one here afterwards
  useEffect(() => setFlavor(globalFlavor), [globalFlavor]);

  const originalRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLCanvasElement>(null);
  const fullRef = useRef<HTMLCanvasElement | null>(null); // full-res original (for download)
  const previewDataRef = useRef<ImageData | null>(null);
  const [version, setVersion] = useState(0);

  // --- worker plumbing (with synchronous fallback) ---
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const pending = useRef(new Map<number, (buf: ArrayBuffer) => void>());

  useEffect(() => {
    if (typeof window === "undefined" || !("Worker" in window)) return;
    try {
      const w = new Worker(new URL("../lib/wallpaper.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const cb = pending.current.get(e.data.id);
        if (cb) {
          pending.current.delete(e.data.id);
          cb(e.data.buffer);
        }
      };
      workerRef.current = w;
      return () => {
        w.terminate();
        workerRef.current = null;
      };
    } catch {
      workerRef.current = null;
    }
  }, []);

  const opts = useCallback(
    (): ConvertOptions => ({ flavor, mode, strength, softness, preserveLuminance }),
    [flavor, mode, strength, softness, preserveLuminance],
  );

  const convert = useCallback(
    (buffer: ArrayBuffer, width: number, height: number, o: ConvertOptions): Promise<ArrayBuffer> => {
      const w = workerRef.current;
      if (!w) {
        const rgba = new Uint8ClampedArray(buffer);
        recolor(rgba, o);
        return Promise.resolve(buffer);
      }
      const id = ++reqId.current;
      return new Promise((resolve) => {
        pending.current.set(id, resolve);
        const msg: WorkerRequest = { id, buffer, width, height, opts: o };
        w.postMessage(msg, [buffer]);
      });
    },
    [],
  );

  // --- load an image (or the generated sample) into preview + full-res canvases ---
  const loadBitmap = useCallback((bmp: ImageBitmap | HTMLCanvasElement, name: string) => {
    const nw = bmp.width;
    const nh = bmp.height;

    // full-res copy for download
    const fScale = Math.min(1, MAX_FULL / Math.max(nw, nh));
    const fw = Math.round(nw * fScale);
    const fh = Math.round(nh * fScale);
    const full = document.createElement("canvas");
    full.width = fw;
    full.height = fh;
    full.getContext("2d")!.drawImage(bmp, 0, 0, fw, fh);
    fullRef.current = full;

    // preview copy
    const pScale = Math.min(1, MAX_PREVIEW / Math.max(nw, nh));
    const pw = Math.round(nw * pScale);
    const ph = Math.round(nh * pScale);
    const oc = originalRef.current!;
    const rc = resultRef.current!;
    oc.width = pw;
    oc.height = ph;
    rc.width = pw;
    rc.height = ph;
    const octx = oc.getContext("2d", { willReadFrequently: true })!;
    octx.drawImage(bmp, 0, 0, pw, ph);
    previewDataRef.current = octx.getImageData(0, 0, pw, ph);

    setAspect(pw / ph);
    setFileName(name);
    setHasImage(true);
    setVersion((v) => v + 1);
  }, []);

  // generate a colorful sample so the tool is alive on first paint (no shipped asset)
  useEffect(() => {
    if (previewDataRef.current) return;
    const c = document.createElement("canvas");
    c.width = 1280;
    c.height = 720;
    const g = c.getContext("2d")!;
    const lin = g.createLinearGradient(0, 0, c.width, c.height);
    lin.addColorStop(0, "#1b2a4a");
    lin.addColorStop(0.45, "#7a3b8f");
    lin.addColorStop(0.7, "#d8633e");
    lin.addColorStop(1, "#f2c14e");
    g.fillStyle = lin;
    g.fillRect(0, 0, c.width, c.height);
    const blobs: [number, number, number, string][] = [
      [320, 230, 300, "rgba(90,170,200,0.55)"],
      [980, 200, 360, "rgba(255,140,90,0.5)"],
      [640, 560, 420, "rgba(150,90,180,0.5)"],
      [1080, 600, 240, "rgba(245,225,120,0.45)"],
    ];
    for (const [x, y, r, col] of blobs) {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    }
    loadBitmap(c, "sample");
  }, [loadBitmap]);

  // --- recompute preview when source or options change (debounced) ---
  const previewToken = useRef(0);
  useEffect(() => {
    if (!hasImage) return;
    const o = opts();
    const t = setTimeout(async () => {
      const src = previewDataRef.current;
      const rc = resultRef.current;
      if (!src || !rc) return;
      setBusy(true);
      const token = ++previewToken.current;
      const out = await convert(src.data.slice().buffer, src.width, src.height, o);
      if (token !== previewToken.current) return; // a newer run superseded this one
      const ctx = rc.getContext("2d")!;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(out), src.width, src.height), 0, 0);
      setBusy(false);
    }, 110);
    return () => clearTimeout(t);
  }, [hasImage, version, opts, convert]);

  // --- file intake ---
  const intake = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const bmp = await createImageBitmap(file);
      loadBitmap(bmp, file.name.replace(/\.[^.]+$/, ""));
    },
    [loadBitmap],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) intake(f);
    },
    [intake],
  );

  // --- before/after divider drag ---
  const compareRef = useRef<HTMLDivElement>(null);
  const onDividerMove = useCallback((clientX: number) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setDivider(Math.max(0, Math.min(100, pct)));
  }, []);

  // --- download at full resolution ---
  const download = useCallback(async () => {
    const full = fullRef.current;
    if (!full) return;
    setSaving(true);
    try {
      const fctx = full.getContext("2d", { willReadFrequently: true })!;
      const src = fctx.getImageData(0, 0, full.width, full.height);
      const out = await convert(src.data.slice().buffer, full.width, full.height, opts());
      const tmp = document.createElement("canvas");
      tmp.width = full.width;
      tmp.height = full.height;
      tmp
        .getContext("2d")!
        .putImageData(new ImageData(new Uint8ClampedArray(out), full.width, full.height), 0, 0);
      const blob = await new Promise<Blob | null>((res) => tmp.toBlob(res, "image/png"));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}-potter-${flavor}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSaving(false);
    }
  }, [convert, opts, fileName, flavor]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      {/* preview + compare */}
      <div
        ref={compareRef}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className="surface-card relative select-none overflow-hidden"
        style={{
          aspectRatio: aspect,
          outline: dragging ? "2px dashed var(--site-accent, var(--potter-peach))" : undefined,
        }}
      >
        <canvas ref={originalRef} className="absolute inset-0 block h-full w-full" />
        <canvas
          ref={resultRef}
          className="absolute inset-0 block h-full w-full"
          style={{ clipPath: `inset(0 0 0 ${divider}%)` }}
        />

        {/* labels */}
        <span
          className="pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "rgb(var(--potter-crust-rgb) / 0.6)", color: "var(--potter-subtext1)" }}
        >
          original
        </span>
        <span
          className="pointer-events-none absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "rgb(var(--potter-crust-rgb) / 0.6)", color: "var(--site-accent, var(--potter-peach))" }}
        >
          potter {flavor}
        </span>

        {/* divider handle */}
        <div
          role="slider"
          aria-label="Compare original and converted"
          aria-valuenow={Math.round(divider)}
          tabIndex={0}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) onDividerMove(e.clientX);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setDivider((d) => Math.max(0, d - 4));
            if (e.key === "ArrowRight") setDivider((d) => Math.min(100, d + 4));
          }}
          className="absolute top-0 z-10 flex h-full w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center"
          style={{ left: `${divider}%` }}
        >
          <span className="h-full w-px" style={{ background: "rgb(var(--potter-text-rgb) / 0.5)" }} />
          <span
            className="absolute flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-lg"
            style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
          >
            ⇆
          </span>
        </div>

        {busy && (
          <span
            className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
            style={{ background: "rgb(var(--potter-crust-rgb) / 0.7)", color: "var(--potter-subtext0)" }}
          >
            inking…
          </span>
        )}
      </div>

      {/* controls */}
      <aside className="space-y-6">
        <div className="space-y-2">
          <Label>Flavor</Label>
          <div className="flex flex-wrap gap-1.5">
            {FLAVORS.map((f) => (
              <Pill key={f} active={f === flavor} onClick={() => setFlavor(f)}>
                {FLAVOR_LABEL[f]}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mode</Label>
          <div className="flex gap-1.5">
            <Pill active={mode === "smooth"} onClick={() => setMode("smooth")}>
              Smooth
            </Pill>
            <Pill active={mode === "nearest"} onClick={() => setMode("nearest")}>
              Nearest
            </Pill>
          </div>
          <p className="text-[11px]" style={{ color: "var(--potter-subtext0)" }}>
            {mode === "smooth"
              ? "Blends toward the palette — keeps gradients and detail."
              : "Snaps every pixel to the closest Potter color — bold and flat."}
          </p>
        </div>

        <Slider label="Strength" value={strength} onChange={setStrength} format={(v) => `${Math.round(v * 100)}%`} />

        {mode === "smooth" && (
          <>
            <Slider label="Softness" value={softness} onChange={setSoftness} format={(v) => `${Math.round(v * 100)}%`} />
            <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--potter-subtext1)" }}>
              <input
                type="checkbox"
                checked={preserveLuminance}
                onChange={(e) => setPreserveLuminance(e.target.checked)}
                className="h-4 w-4 accent-[var(--site-accent,var(--potter-peach))]"
              />
              Preserve brightness
            </label>
          </>
        )}

        <div className="space-y-2 pt-2">
          <label
            className="block cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors"
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
            onClick={download}
            disabled={saving}
            className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
          >
            {saving ? "preparing…" : "Download PNG"}
          </button>
          <p className="text-center text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
            or drop an image onto the preview
          </p>
        </div>
      </aside>
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
  value,
  onChange,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-[11px]" style={{ color: "var(--potter-subtext1)" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--site-accent,var(--potter-peach))]"
      />
    </div>
  );
}
