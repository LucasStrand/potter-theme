"use client";
import { useFlavor } from "../flavor-provider";
import { palette } from "../lib/palette";

function Chrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--potter-surface0)", background: "var(--potter-mantle)" }}>
      <span className="h-3 w-3 rounded-full" style={{ background: "var(--potter-red)" }} />
      <span className="h-3 w-3 rounded-full" style={{ background: "var(--potter-yellow)" }} />
      <span className="h-3 w-3 rounded-full" style={{ background: "var(--potter-green)" }} />
      <span className="ml-2 font-mono text-xs" style={{ color: "var(--potter-subtext0)" }}>{title}</span>
    </div>
  );
}

const C = ({ t, c }: { t: string; c: string }) => <span style={{ color: `var(--potter-${c})` }}>{t}</span>;

export function Showroom() {
  const { flavor } = useFlavor();
  const ansi = palette[flavor].ansi;
  const order = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* editor */}
      <div className="surface-card overflow-hidden font-mono text-[13px] leading-relaxed shadow-xl" style={{ background: "var(--potter-base)" }}>
        <Chrome title="brew.ts — potter" />
        <pre className="overflow-x-auto p-4" style={{ color: "var(--potter-text)" }}>
          <code>
            <div><C t="// a quill writes in three inks" c="overlay1" /></div>
            <div><C t="import" c="mauve" /> {"{ Flavor }"} <C t="from" c="mauve" /> <C t={'"@potternu/palette"'} c="green" /><C t=";" c="overlay2" /></div>
            <div>&nbsp;</div>
            <div><C t="export function" c="mauve" /> <C t="brew" c="blue" /><C t="(" c="overlay2" /><C t="flavor" c="maroon" /><C t=": " c="overlay2" /><C t="Flavor" c="yellow" /><C t=")" c="overlay2" /> {"{"}</div>
            <div>{"  "}<C t="const" c="mauve" /> <C t="accent" c="text" /> <C t="=" c="sky" /> <C t={'"#d97757"'} c="green" /><C t=";" c="overlay2" /> <C t="// peach" c="overlay1" /></div>
            <div>{"  "}<C t="const" c="mauve" /> <C t="steeped" c="text" /> <C t="=" c="sky" /> <C t="3" c="peach" /><C t=";" c="overlay2" /></div>
            <div>{"  "}<C t="return" c="mauve" /> {"{ "}<C t="flavor" c="sapphire" /><C t="," c="overlay2" /> <C t="accent" c="sapphire" /><C t="," c="overlay2" /> <C t="steeped" c="sapphire" /> {"};"}</div>
            <div>{"}"}</div>
          </code>
        </pre>
      </div>

      {/* terminal */}
      <div className="surface-card overflow-hidden font-mono text-[13px] leading-relaxed shadow-xl" style={{ background: "var(--potter-base)" }}>
        <Chrome title="kitty — potter" />
        <div className="p-4" style={{ color: "var(--potter-text)" }}>
          <div><C t="❯" c="green" /> potter --flavor {flavor}</div>
          <div className="mt-1" style={{ color: "var(--potter-subtext1)" }}>steeping {palette[flavor].name}…</div>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {order.map((k) => (
              <div key={k} className="h-6 rounded" title={k} style={{ background: ansi[k].normal.hex }} />
            ))}
            {order.map((k) => (
              <div key={k + "b"} className="h-6 rounded" title={`bright ${k}`} style={{ background: ansi[k].bright.hex }} />
            ))}
          </div>
          <div className="mt-3">
            <C t="✓" c="green" /> 16 colors{"  "}
            <C t="✓" c="green" /> ANSI{"  "}
            <C t="!" c="yellow" /> warm{"  "}
            <C t="●" c="red" /> error
          </div>
          <div className="mt-1"><C t="❯" c="green" /> <span className="inline-block w-2 animate-pulse" style={{ background: "var(--site-accent, var(--potter-peach))" }}>&nbsp;</span></div>
        </div>
      </div>
    </div>
  );
}
