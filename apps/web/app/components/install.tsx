"use client";
import { useState } from "react";
import { useFlavor } from "../flavor-provider";
import { useCopy } from "../lib/use-copy";

const TABS = ["CSS", "Tailwind", "Neovim", "Terminal"] as const;
type Tab = (typeof TABS)[number];

function snippet(tab: Tab, flavor: string): string {
  switch (tab) {
    case "CSS":
      return `npm i @potternu/css\n\n<html data-potter-flavor="${flavor}">\n@import "@potternu/css";\n\n.btn {\n  background: var(--potter-peach);\n  color: var(--potter-base);\n}`;
    case "Tailwind":
      return `npm i @potternu/css @potternu/tailwind\n\n@import "@potternu/css";\n@import "@potternu/tailwind";\n\n<div class="bg-potter-base text-potter-text">\n  <span class="text-potter-peach">Potter</span>\n</div>`;
    case "Neovim":
      return `require("potter").load("${flavor}")\n-- or:\n:colorscheme potter-${flavor}`;
    case "Terminal":
      return `# kitty.conf\ninclude potter-${flavor}.conf\n\n# alacritty.toml\nimport = ["potter-${flavor}.toml"]`;
  }
}

export function Install() {
  const { flavor } = useFlavor();
  const [tab, setTab] = useState<Tab>("CSS");
  const { copied, copy } = useCopy();
  const code = snippet(tab, flavor);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b p-2" style={{ borderColor: "var(--potter-surface0)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: t === tab ? "var(--potter-surface1)" : "transparent",
              color: t === tab ? "var(--potter-text)" : "var(--potter-subtext0)",
            }}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => copy(code)}
          className="ml-auto cursor-pointer rounded-lg px-3.5 py-1.5 font-mono text-xs transition-colors"
          style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
        >
          {copied === code ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed" style={{ background: "var(--potter-base)", color: "var(--potter-subtext1)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
