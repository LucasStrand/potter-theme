"use client";
// SVG → PNG converter (/svgpng-converter).
// Goals: highest-possible rasterization success rate + genuine, verifiable
// transparency. Renders SVG to a canvas at any size, previews it over a
// checkerboard, and offers manual cleanup tools (color-key removal, flood fill,
// eraser brush, trim) so the exported PNG is *actually* transparent where it
// should be. Everything runs locally in the browser.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlavorSwitch } from "./flavor-switch";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#ffffff"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e08a6a"/><stop offset="1" stop-color="#b5683f"/>
  </linearGradient></defs>
  <rect x="36" y="36" width="168" height="168" rx="36" fill="url(#g)"/>
  <path d="M120 78l11 26 28 2-21 18 7 27-25-15-25 15 7-27-21-18 28-2z" fill="#fff"/>
</svg>`;

type RGB = [number, number, number];

function redmean2(r: number, g: number, b: number, t: RGB): number {
  const rmean = (r + t[0]) >> 1;
  const dr = r - t[0];
  const dg = g - t[1];
  const db = b - t[2];
  return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

/** Make a markup string safe to rasterize: guarantee xmlns + a usable size. */
function normalizeSvg(src: string): { svg: string; w: number; h: number } | null {
  const trimmed = src.trim();
  if (!trimmed.includes("<svg")) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(trimmed, "image/svg+xml");
  } catch {
    return null;
  }
  const el = doc.documentElement;
  if (!el || el.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) return null;
  if (!el.getAttribute("xmlns")) el.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const num = (v: string | null) => {
    if (!v) return NaN;
    const m = parseFloat(v);
    return Number.isFinite(m) && !v.includes("%") ? m : NaN;
  };
  let w = num(el.getAttribute("width"));
  let h = num(el.getAttribute("height"));
  const vb = (el.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if ((!w || !h) && vb.length === 4) {
    w = w || vb[2];
    h = h || vb[3];
  }
  if (!w || !h) {
    w = w || 512;
    h = h || 512;
  }
  if (!el.getAttribute("viewBox") && vb.length !== 4) el.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const svg = new XMLSerializer().serializeToString(el);
  return { svg, w: Math.round(w), h: Math.round(h) };
}

type BgMode = "transparent" | "white" | "black" | "custom";
type Tool = "none" | "pick" | "erase";

export function SvgPngConverter() {
  const [svgText, setSvgText] = useState(SAMPLE_SVG);
  const [intrinsic, setIntrinsic] = useState<{ w: number; h: number }>({ w: 240, h: 240 });
  const [outWidth, setOutWidth] = useState(1024);
  const [bgMode, setBgMode] = useState<BgMode>("transparent");
  const [customBg, setCustomBg] = useState("#1c1812");
  const [tool, setTool] = useState<Tool>("none");
  const [tolerance, setTolerance] = useState(32);
  const [contiguous, setContiguous] = useState(true);
  const [brush, setBrush] = useState(28);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const aspect = intrinsic.w / intrinsic.h;
  const outHeight = Math.max(1, Math.round(outWidth / aspect));

  const pushUndo = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const snap = ctx.getImageData(0, 0, c.width, c.height);
    undoStack.current.push(snap);
    if (undoStack.current.length > 25) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const c = canvasRef.current;
    const prev = undoStack.current.pop();
    if (!c || !prev) return;
    c.width = prev.width;
    c.height = prev.height;
    c.getContext("2d")!.putImageData(prev, 0, 0);
    setIntrinsic({ w: prev.width, h: prev.height });
    setCanUndo(undoStack.current.length > 0);
  }, []);

  // Rasterize the SVG into the canvas at the chosen output size (resets edits).
  const render = useCallback((text: string, width: number, bg: BgMode, bgHex: string) => {
    const norm = normalizeSvg(text);
    if (!norm) {
      setError("That doesn't look like valid SVG markup.");
      setReady(false);
      return;
    }
    setError(null);
    setIntrinsic({ w: norm.w, h: norm.h });
    const a = norm.w / norm.h;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(w / a));

    const img = new Image();
    img.decoding = "async";
    const blob = new Blob([norm.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.clearRect(0, 0, w, h);
      if (bg !== "transparent") {
        ctx.fillStyle = bg === "white" ? "#ffffff" : bg === "black" ? "#000000" : bgHex;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      undoStack.current = [];
      setCanUndo(false);
      setReady(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Could not rasterize this SVG. It may reference external resources the browser blocked.");
      setReady(false);
    };
    img.src = url;
  }, []);

  // initial + re-render when source/size/background change
  useEffect(() => {
    render(svgText, outWidth, bgMode, customBg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgText, outWidth, bgMode, customBg]);

  const intake = useCallback(async (file: File) => {
    if (!/svg/i.test(file.type) && !/\.svg$/i.test(file.name)) {
      setError("Please choose an .svg file.");
      return;
    }
    const text = await file.text();
    setSvgText(text);
  }, []);

  // --- pixel ops ---
  const eventToPixel = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
    return { x: Math.max(0, Math.min(c.width - 1, x)), y: Math.max(0, Math.min(c.height - 1, y)) };
  };

  const keyOutColor = useCallback(
    (px: number, py: number) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      const { width: W, height: H } = c;
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      const i0 = (py * W + px) * 4;
      if (d[i0 + 3] === 0) return; // already transparent
      const target: RGB = [d[i0], d[i0 + 1], d[i0 + 2]];
      const tol2 = tolerance * tolerance;
      const matches = (i: number) => d[i + 3] !== 0 && redmean2(d[i], d[i + 1], d[i + 2], target) <= tol2;

      if (contiguous) {
        const stack = [py * W + px];
        const seen = new Uint8Array(W * H);
        while (stack.length) {
          const p = stack.pop()!;
          if (seen[p]) continue;
          seen[p] = 1;
          const i = p * 4;
          if (!matches(i)) continue;
          d[i + 3] = 0;
          const x = p % W;
          const y = (p / W) | 0;
          if (x > 0) stack.push(p - 1);
          if (x < W - 1) stack.push(p + 1);
          if (y > 0) stack.push(p - W);
          if (y < H - 1) stack.push(p + W);
        }
      } else {
        for (let i = 0; i < d.length; i += 4) if (matches(i)) d[i + 3] = 0;
      }
      ctx.putImageData(img, 0, 0);
    },
    [tolerance, contiguous],
  );

  const eraseAt = useCallback(
    (e: React.PointerEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const { x, y } = eventToPixel(e);
      const r = (brush / 2) * (c.width / (c.getBoundingClientRect().width || c.width));
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    },
    [brush],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === "none" || !ready) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pushUndo();
    if (tool === "pick") {
      const { x, y } = eventToPixel(e);
      keyOutColor(x, y);
    } else if (tool === "erase") {
      eraseAt(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (tool === "erase" && e.buttons === 1 && ready) eraseAt(e);
  };

  const trim = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const { width: W, height: H } = c;
    const d = ctx.getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (d[(y * W + x) * 4 + 3] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    if (maxX < 0) return; // fully transparent
    const nw = maxX - minX + 1;
    const nh = maxY - minY + 1;
    if (nw === W && nh === H) return;
    pushUndo();
    const cropped = ctx.getImageData(minX, minY, nw, nh);
    c.width = nw;
    c.height = nh;
    ctx.putImageData(cropped, 0, 0);
    setIntrinsic({ w: nw, h: nh });
  }, [pushUndo]);

  const removeWhite = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !ready) return;
    pushUndo();
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const tol2 = tolerance * tolerance;
    const target: RGB = [255, 255, 255];
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3] !== 0 && redmean2(d[i], d[i + 1], d[i + 2], target) <= tol2) d[i + 3] = 0;
    ctx.putImageData(img, 0, 0);
  }, [ready, tolerance, pushUndo]);

  const download = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "image.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        {/* top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--potter-subtext1)" }}>
            <Link href="/tools/wallpaper-converter" className="transition-opacity hover:opacity-70">Wallpaper</Link>
            <FlavorSwitch size="sm" />
          </div>
        </div>

        <header className="mt-10 sm:mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            svg → png
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Crisp PNGs, honestly transparent
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Rasterize any SVG at any size, then verify and fix the alpha by hand — color-key removal, flood
            fill, and an eraser — so the exported PNG is transparent exactly where you want.
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
                minHeight: 360,
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
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                className="block h-auto max-w-full"
                style={{
                  maxHeight: 560,
                  cursor: tool === "pick" ? "crosshair" : tool === "erase" ? "cell" : "default",
                  touchAction: "none",
                  boxShadow: "0 8px 40px -12px rgba(0,0,0,.5)",
                }}
              />
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
              checkerboard = transparent · output {outWidth}×{outHeight}px · source {intrinsic.w}×{intrinsic.h}
            </p>
          </div>

          {/* controls */}
          <aside className="space-y-6">
            {/* source */}
            <div className="space-y-2">
              <Label>Source SVG</Label>
              <div className="flex gap-1.5">
                <label
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Upload .svg
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) intake(f);
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowPaste((s) => !s)}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-subtext1)" }}
                >
                  {showPaste ? "Hide" : "Paste"}
                </button>
              </div>
              {showPaste && (
                <textarea
                  value={svgText}
                  onChange={(e) => setSvgText(e.target.value)}
                  spellCheck={false}
                  className="h-32 w-full rounded-lg p-2 font-mono text-[11px] leading-snug"
                  style={{ background: "var(--potter-mantle)", color: "var(--potter-subtext1)", border: "1px solid var(--potter-surface0)" }}
                  placeholder="<svg …>…</svg>"
                />
              )}
              <p className="text-[11px]" style={{ color: "var(--potter-overlay2)" }}>or drop an .svg onto the preview</p>
            </div>

            {/* output size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Output width</Label>
                <span className="font-mono text-[11px]" style={{ color: "var(--potter-subtext1)" }}>{outWidth}px</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[256, 512, 1024, 2048].map((w) => (
                  <Pill key={w} active={outWidth === w} onClick={() => setOutWidth(w)}>{w}</Pill>
                ))}
                {[1, 2, 4].map((m) => (
                  <Pill key={`x${m}`} active={outWidth === intrinsic.w * m} onClick={() => setOutWidth(intrinsic.w * m)}>
                    {m}× src
                  </Pill>
                ))}
              </div>
              <input
                type="range"
                min={32}
                max={4096}
                step={1}
                value={outWidth}
                onChange={(e) => setOutWidth(Number(e.target.value))}
                className="w-full accent-[var(--site-accent,var(--potter-peach))]"
              />
            </div>

            {/* background */}
            <div className="space-y-2">
              <Label>Background</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill active={bgMode === "transparent"} onClick={() => setBgMode("transparent")}>Transparent</Pill>
                <Pill active={bgMode === "white"} onClick={() => setBgMode("white")}>White</Pill>
                <Pill active={bgMode === "black"} onClick={() => setBgMode("black")}>Black</Pill>
                <Pill active={bgMode === "custom"} onClick={() => setBgMode("custom")}>Custom</Pill>
                {bgMode === "custom" && (
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                )}
              </div>
            </div>

            {/* transparency tools */}
            <div className="space-y-3 rounded-xl p-3" style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}>
              <Label>Make transparent</Label>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={tool === "pick"} onClick={() => setTool(tool === "pick" ? "none" : "pick")}>Remove color</Pill>
                <Pill active={tool === "erase"} onClick={() => setTool(tool === "erase" ? "none" : "erase")}>Eraser</Pill>
              </div>
              <p className="text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
                {tool === "pick"
                  ? contiguous
                    ? "Click an area to flood-clear the connected region of that color."
                    : "Click a color to clear every matching pixel in the image."
                  : tool === "erase"
                    ? "Drag across the image to rub pixels away."
                    : "Pick a tool, then work directly on the preview."}
              </p>

              {tool === "pick" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Tolerance</Label>
                    <span className="font-mono text-[11px]" style={{ color: "var(--potter-subtext1)" }}>{tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={140}
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full accent-[var(--site-accent,var(--potter-peach))]"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--potter-subtext1)" }}>
                    <input type="checkbox" checked={contiguous} onChange={(e) => setContiguous(e.target.checked)} className="h-4 w-4 accent-[var(--site-accent,var(--potter-peach))]" />
                    Contiguous (flood fill)
                  </label>
                  <button
                    onClick={removeWhite}
                    className="w-full cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                    style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                  >
                    Remove white background
                  </button>
                </>
              )}

              {tool === "erase" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Brush</Label>
                    <span className="font-mono text-[11px]" style={{ color: "var(--potter-subtext1)" }}>{brush}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={120}
                    value={brush}
                    onChange={(e) => setBrush(Number(e.target.value))}
                    className="w-full accent-[var(--site-accent,var(--potter-peach))]"
                  />
                </>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Undo
                </button>
                <button
                  onClick={trim}
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Trim edges
                </button>
                <button
                  onClick={() => render(svgText, outWidth, bgMode, customBg)}
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={download}
              disabled={!ready}
              className="w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
            >
              Download PNG
            </button>
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
