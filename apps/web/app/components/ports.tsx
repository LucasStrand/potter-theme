const PORTS = [
  { ic: "C", name: "CSS / Sass", blurb: "vars + maps, light/dark auto" },
  { ic: "T", name: "Tailwind", blurb: "v4 tokens + v3 preset" },
  { ic: "N", name: "Neovim", blurb: "Treesitter + LSP groups" },
  { ic: "K", name: "Terminals", blurb: "kitty · alacritty · wezterm · foot" },
  { ic: "V", name: "VS Code", blurb: "3 themes, full token map" },
  { ic: "X", name: "Xresources", blurb: "X11 / xterm / urxvt" },
  { ic: "G", name: "GIMP", blurb: ".gpl · Inkscape · Krita" },
  { ic: "⊞", name: "tmux", blurb: "statusline + panes" },
  { ic: "{}", name: "JSON", blurb: "flat tokens for anything" },
  { ic: "◆", name: "@potter/palette", blurb: "typed JS/TS bindings" },
];

export function Ports() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PORTS.map((p) => (
        <div
          key={p.name}
          className="flex flex-col gap-2 rounded-2xl p-4 transition-transform hover:-translate-y-1"
          style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}
        >
          <span
            className="font-display grid h-9 w-9 place-items-center rounded-xl text-sm font-bold"
            style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
          >
            {p.ic}
          </span>
          <b className="text-sm" style={{ color: "var(--potter-text)" }}>{p.name}</b>
          <span className="text-xs" style={{ color: "var(--potter-subtext0)" }}>{p.blurb}</span>
        </div>
      ))}
    </div>
  );
}
