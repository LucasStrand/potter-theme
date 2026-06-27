"use client";
// Ambient "paper & ink" canvas behind the Pensive hero — a pooled inkwell that
// breathes light up a quill-beam while diff glyphs and wisps drift overhead.
// Ported from the Pensive Download Claude Design component (DCLogic → React).
// Palette tracks the active Potter flavor; honours prefers-reduced-motion.

import { useEffect, useRef } from "react";

export type PensivePalette = "quill" | "ink" | "moonlit";

type RGB = [number, number, number];
type Flavor = { bgInner: string; bgOuter: string; glow: RGB; spark: RGB; rim: RGB };

const PALETTES: Record<PensivePalette, Flavor> = {
  quill: { bgInner: "#241d14", bgOuter: "#120f0a", glow: [224, 138, 106], spark: [232, 207, 192], rim: [224, 178, 90] },
  ink: { bgInner: "#161412", bgOuter: "#060605", glow: [224, 138, 106], spark: [233, 230, 224], rim: [226, 180, 92] },
  moonlit: { bgInner: "#1c1a18", bgOuter: "#0c0a08", glow: [143, 186, 196], spark: [205, 222, 226], rim: [127, 174, 192] },
};

const GLYPHS = ["+", "-", "+", "{", "}", "<", "/>", "-", "+"];
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

type Wisp = { x: number; y: number; vy: number; r: number; life: number; max: number; sway: number; phase: number };
type Drop = { x: number; y: number; v: number; r: number };
type Ripple = { x: number; r: number; max: number };
type Glyph = { x: number; y: number; vx: number; g: string; s: number; life: number; max: number };

export function PensiveCanvas({
  palette = "quill",
  motionIntensity = 1,
  className,
  style,
}: {
  palette?: PensivePalette;
  motionIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live values the animation loop reads each frame without re-subscribing.
  const paletteRef = useRef(palette);
  const motionRef = useRef(motionIntensity);
  paletteRef.current = palette;
  motionRef.current = motionIntensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0,
      H = 0,
      dpr = 1,
      bx = 0,
      by = 0;
    let wisps: Wisp[] = [];
    let drops: Drop[] = [];
    let ripples: Ripple[] = [];
    let glyphs: Glyph[] = [];
    let raf = 0;
    let dropAcc = 0;

    const newWisp = (scatter: boolean): Wisp => ({
      x: bx + (Math.random() - 0.5) * W * 0.62,
      y: scatter ? by - Math.random() * H * 0.5 : by + (Math.random() - 0.5) * 30,
      vy: -(0.12 + Math.random() * 0.3),
      r: 7 + Math.random() * 26,
      life: scatter ? Math.random() * 700 : 0,
      max: 520 + Math.random() * 620,
      sway: 0.4 + Math.random() * 1.1,
      phase: Math.random() * 6.28,
    });
    const newGlyph = (): Glyph => ({
      x: bx + (Math.random() - 0.5) * W * 0.46,
      y: by - 6 + (Math.random() - 0.5) * 70,
      vx: (Math.random() - 0.5) * 0.18,
      g: GLYPHS[(Math.random() * GLYPHS.length) | 0],
      s: 11 + Math.random() * 9,
      life: Math.random() * 600,
      max: 600 + Math.random() * 500,
    });

    const seed = () => {
      bx = W * 0.5;
      by = H * 0.7;
      wisps = [];
      drops = [];
      ripples = [];
      glyphs = [];
      const n = Math.min(120, Math.round(W / 13));
      for (let i = 0; i < n; i++) wisps.push(newWisp(true));
      const gn = Math.min(16, Math.round(W / 110));
      for (let i = 0; i < gn; i++) glyphs.push(newGlyph());
    };

    const glow = (cx: number, cy: number, r: number, squash: number, col: RGB, a0: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, squash);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(col, a0));
      g.addColorStop(0.5, rgba(col, a0 * 0.32));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    };

    const paintStatic = () => {
      const cfg = PALETTES[paletteRef.current] ?? PALETTES.quill;
      ctx.globalCompositeOperation = "source-over";
      const bgg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(W, H) * 0.85);
      bgg.addColorStop(0, cfg.bgInner);
      bgg.addColorStop(1, cfg.bgOuter);
      ctx.fillStyle = bgg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      glow(bx, by, W * 0.34, 0.34, cfg.glow, 0.5);
      glow(bx, by, W * 0.14, 0.34, cfg.spark, 0.28);
    };

    const frame = (now: number) => {
      const cfg = PALETTES[paletteRef.current] ?? PALETTES.quill;
      const mo = motionRef.current ?? 1;
      const t = now * 0.001;

      ctx.globalCompositeOperation = "source-over";
      const bgg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(W, H) * 0.85);
      bgg.addColorStop(0, cfg.bgInner);
      bgg.addColorStop(1, cfg.bgOuter);
      ctx.fillStyle = bgg;
      ctx.fillRect(0, 0, W, H);

      for (const gl of glyphs) {
        gl.x += gl.vx;
        gl.life++;
        if (gl.life > gl.max) Object.assign(gl, newGlyph(), { life: 0 });
        const a = Math.sin((Math.PI * gl.life) / gl.max) * 0.1;
        ctx.font = "400 " + gl.s.toFixed(1) + "px 'JetBrains Mono', monospace";
        ctx.fillStyle = rgba(cfg.spark, a);
        ctx.fillText(gl.g, gl.x, gl.y);
      }

      ctx.globalCompositeOperation = "lighter";

      const pulse = 0.65 + 0.35 * Math.sin(t * 0.9);
      const beam = ctx.createLinearGradient(0, H * 0.02, 0, by);
      beam.addColorStop(0, rgba(cfg.spark, 0));
      beam.addColorStop(0.55, rgba(cfg.spark, 0.045 * pulse));
      beam.addColorStop(1, rgba(cfg.spark, 0.16 * pulse));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(bx - 2, H * 0.02);
      ctx.lineTo(bx + 2, H * 0.02);
      ctx.lineTo(bx + 9, by);
      ctx.lineTo(bx - 9, by);
      ctx.closePath();
      ctx.fill();

      glow(bx, by, W * 0.34, 0.34, cfg.glow, 0.5);
      glow(bx, by, W * 0.14, 0.34, cfg.spark, 0.28);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1, 0.34);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(cfg.rim, 0.16);
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.205, 0, 6.2832);
      ctx.stroke();
      ctx.strokeStyle = rgba(cfg.rim, 0.1);
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.255, 0, 6.2832);
      ctx.stroke();
      ctx.restore();

      dropAcc += mo;
      while (dropAcc >= 1.7) {
        dropAcc -= 1.7;
        if (drops.length < 60)
          drops.push({ x: bx + (Math.random() - 0.5) * 10, y: H * 0.05, v: 1.8 + Math.random() * 1.6, r: 1.1 + Math.random() * 1.5 });
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.v * mo;
        d.v += 0.04 * mo;
        const near = Math.min(1, (d.y - H * 0.05) / (by - H * 0.05));
        ctx.fillStyle = rgba(cfg.spark, 0.5 + 0.4 * near);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 6.2832);
        ctx.fill();
        if (d.y >= by) {
          drops.splice(i, 1);
          if (ripples.length < 14) ripples.push({ x: bx + (Math.random() - 0.5) * 14, r: 0, max: W * (0.16 + Math.random() * 0.13) });
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (1.1 + rp.r * 0.012) * mo;
        const prog = rp.r / rp.max;
        if (prog >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(rp.x, by);
        ctx.scale(1, 0.32);
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = rgba(cfg.rim, (1 - prog) * 0.42);
        ctx.beginPath();
        ctx.arc(0, 0, rp.r, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
      }

      for (const w of wisps) {
        w.life++;
        w.y += w.vy * mo;
        w.x += Math.sin(t * w.sway + w.phase) * 0.45;
        if (w.life > w.max || w.y < H * 0.08) Object.assign(w, newWisp(false), { life: 0 });
        const a = Math.sin((Math.PI * w.life) / w.max) * 0.5;
        const rad = w.r * (0.7 + 0.5 * (w.life / w.max));
        glow(w.x, w.y, rad, 1, cfg.spark, a * 0.7);
      }

      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) paintStatic();
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={style} aria-hidden />;
}
