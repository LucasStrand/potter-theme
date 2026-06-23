"use client";
import { useState } from "react";
import { ACCENTS, NEUTRALS, palette, contrast, type ColorName } from "../lib/palette";
import { useCopy } from "../lib/use-copy";

const FLAVORS = ["parchment", "quill", "ink"] as const;
type FlavorId = (typeof FLAVORS)[number];

export function PaletteExplorer() {
  const { copied, copy } = useCopy();
  const [sel, setSel] = useState<{ fid: FlavorId; name: ColorName }>({ fid: "quill", name: "peach" });

  const data = palette[sel.fid];
  const c = data.colors[sel.name];
  const ratio = contrast(c.rgb, data.colors.base.rgb);
  const onText = contrast(c.rgb, data.colors.text.rgb);
  const badge = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-large" : "low";

  const Swatch = ({ fid, name }: { fid: FlavorId; name: ColorName }) => {
    const col = palette[fid].colors[name];
    const isSel = sel.fid === fid && sel.name === name;
    return (
      <button
        onClick={() => { setSel({ fid, name }); copy(col.hex); }}
        onMouseEnter={() => setSel({ fid, name })}
        className="group relative overflow-hidden rounded-xl text-left transition-transform hover:-translate-y-1"
        style={{ border: isSel ? "2px solid var(--potter-text)" : "1px solid var(--potter-surface1)", background: "var(--potter-mantle)" }}
        title={`${name} — click to copy ${col.hex}`}
      >
        <div className="h-16 w-full" style={{ background: col.hex }} />
        <div className="px-2.5 py-1.5">
          <div className="text-xs font-medium" style={{ color: "var(--potter-text)" }}>{name}</div>
          <div
            className="font-mono text-[10px] uppercase"
            style={{ color: copied === col.hex ? "var(--potter-green)" : "var(--potter-subtext0)" }}
          >
            {copied === col.hex ? "copied ✓" : col.hex}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* grouped swatches */}
      <div className="space-y-12">
        {FLAVORS.map((fid) => (
          <div key={fid}>
            <h3 className="font-display mb-5 text-2xl font-semibold" style={{ color: "var(--potter-text)" }}>
              {palette[fid].name}
              <span className="ml-3 font-mono text-[11px] font-normal uppercase tracking-[0.2em]" style={{ color: "var(--potter-overlay2)" }}>
                {palette[fid].dark ? "dark" : "light"}
              </span>
            </h3>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-overlay2)" }}>Hues</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
              {ACCENTS.map((n) => <Swatch key={n} fid={fid} name={n} />)}
            </div>
            <p className="mb-3 mt-8 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-overlay2)" }}>Neutrals</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              {NEUTRALS.map((n) => <Swatch key={n} fid={fid} name={n} />)}
            </div>
          </div>
        ))}
      </div>

      {/* sticky detail card — follows on scroll */}
      <aside className="surface-card h-fit overflow-hidden lg:sticky lg:top-20">
        <div className="h-28 w-full" style={{ background: c.hex }} />
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-2xl font-semibold capitalize" style={{ color: "var(--potter-text)" }}>{sel.name}</h3>
            {c.accent && (
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--potter-overlay2)" }}>accent</span>
            )}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--potter-overlay2)" }}>{data.name}</div>
          <button
            onClick={() => copy(c.hex)}
            className="mt-3 w-full cursor-pointer rounded-lg px-3 py-2 text-left font-mono text-sm transition-colors"
            style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
          >
            {copied === c.hex ? "copied ✓" : c.hex.toUpperCase()}
          </button>
          <dl className="mt-4 space-y-2 font-mono text-xs" style={{ color: "var(--potter-subtext1)" }}>
            <Row k="rgb" v={`${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}`} />
            <Row k="hsl" v={`${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%`} />
            <Row k="on base" v={`${ratio.toFixed(2)} : 1`} />
            <Row k="on text" v={`${onText.toFixed(2)} : 1`} />
          </dl>
          <div className="mt-4 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: badge === "low" ? "rgb(var(--potter-red-rgb) / 0.18)" : "rgb(var(--potter-green-rgb) / 0.18)",
                color: badge === "low" ? "var(--potter-red)" : "var(--potter-green)",
              }}
            >
              {badge}
            </span>
            <span className="text-[11px]" style={{ color: "var(--potter-subtext0)" }}>contrast on base</span>
          </div>
          <div className="mt-5 rounded-lg p-3" style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)" }}>
            <span className="font-mono text-sm" style={{ color: c.hex }}>const ink = &quot;{sel.name}&quot;;</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: "var(--potter-overlay2)" }}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
