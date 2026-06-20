"use client";
import { useEffect, useRef } from "react";
import { useFlavor } from "../flavor-provider";

type Blob = { x: number; y: number; r: number; max: number; a: number; grow: number; hue: string };

/**
 * Ink-on-paper bloom. A 2D canvas where blooms of the live accent color
 * diffuse outward and fade — denser where the cursor moves. Reads the actual
 * resolved Potter colors from CSS custom properties so it re-inks on flavor change.
 */
export function InkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { flavor, accent } = useFlavor();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const g = el.getContext("2d");
    if (!g) return;
    // non-null locals so the closures below keep the narrowing
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = g;

    const root = getComputedStyle(document.documentElement);
    const palette = [accent, "rosewater", "peach", "maroon"].map((n) =>
      root.getPropertyValue(`--potter-${n}`).trim() || "#d97757",
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const blobs: Blob[] = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawn(x: number, y: number, scale = 1) {
      if (blobs.length > 90) blobs.shift();
      blobs.push({
        x, y,
        r: 2,
        max: (40 + Math.random() * 130) * scale,
        a: 0.12 + Math.random() * 0.14,
        grow: 0.4 + Math.random() * 0.9,
        hue: palette[(Math.random() * palette.length) | 0],
      });
    }

    // seed
    for (let i = 0; i < (reduce ? 10 : 6); i++) spawn(Math.random() * w, Math.random() * h, 1.4);

    let last = 0;
    function onMove(e: PointerEvent) {
      const now = performance.now();
      if (now - last < 28) return;
      last = now;
      const rect = canvas.getBoundingClientRect();
      spawn(e.clientX - rect.left, e.clientY - rect.top, 0.7);
    }
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let ambient = 0;
    function frame() {
      // paper wash: gently fade toward base for soft trails
      const base = root.getPropertyValue("--potter-base").trim() || "#1c1812";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = hexA(base, 0.06);
      ctx.fillRect(0, 0, w, h);

      for (let i = blobs.length - 1; i >= 0; i--) {
        const b = blobs[i];
        b.r += b.grow;
        b.a *= 0.985;
        if (b.r > b.max || b.a < 0.004) { blobs.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.hue, b.a));
        g.addColorStop(0.6, hexA(b.hue, b.a * 0.35));
        g.addColorStop(1, hexA(b.hue, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduce) {
        ambient++;
        if (ambient % 90 === 0) spawn(Math.random() * w, Math.random() * h, 1);
        raf = requestAnimationFrame(frame);
      }
    }
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [flavor, accent]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

/** "#rrggbb" + alpha -> "rgba()". */
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
