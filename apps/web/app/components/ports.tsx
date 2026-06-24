const REPO = "https://github.com/LucasStrand/potter-theme/tree/main";

const PORTS = [
  { ic: "C", name: "CSS / Sass", blurb: "vars + maps, light/dark auto", path: "/ports/css" },
  { ic: "T", name: "Tailwind", blurb: "v4 tokens + v3 preset", path: "/ports/tailwind" },
  { ic: "N", name: "Neovim", blurb: "Treesitter + LSP groups", path: "/ports/nvim" },
  { ic: "K", name: "Terminals", blurb: "kitty · alacritty · wezterm · foot", path: "/ports/terminal" },
  { ic: "W", name: "Windows Terminal", blurb: "3 flavor schemes (.json)", path: "/ports/windows-terminal" },
  { ic: "V", name: "VS Code", blurb: "3 themes, full token map", path: "/ports/vscode" },
  { ic: "X", name: "Xresources", blurb: "X11 / xterm / urxvt", path: "/ports/xresources" },
  { ic: "G", name: "GIMP", blurb: ".gpl · Inkscape · Krita", path: "/ports/gimp" },
  { ic: "⊞", name: "tmux", blurb: "statusline + panes", path: "/ports/tmux" },
  { ic: "H", name: "Hyprland", blurb: "color vars to source", path: "/ports/hyprland" },
  { ic: "B", name: "Waybar", blurb: "@define-color CSS", path: "/ports/waybar" },
  { ic: "R", name: "rofi", blurb: ".rasi theme vars", path: "/ports/rofi" },
  { ic: "M", name: "mako", blurb: "notification colors", path: "/ports/mako" },
  { ic: "{}", name: "JSON", blurb: "flat tokens for anything", path: "/ports/json" },
  { ic: "◆", name: "@potternu/palette", blurb: "typed JS/TS bindings", path: "/palette" },
];

export function Ports() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PORTS.map((p) => (
        <a
          key={p.name}
          href={`${REPO}${p.path}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`${p.name} source on GitHub`}
          className="group relative flex flex-col gap-2 rounded-2xl p-4 transition-transform hover:-translate-y-1"
          style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}
        >
          <span
            className="absolute right-3 top-3 font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "var(--potter-subtext0)" }}
            aria-hidden
          >
            ↗
          </span>
          <span
            className="font-display grid h-9 w-9 place-items-center rounded-xl text-sm font-bold"
            style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
          >
            {p.ic}
          </span>
          <b className="text-sm transition-colors group-hover:text-[var(--site-accent,var(--potter-peach))]" style={{ color: "var(--potter-text)" }}>
            {p.name}
          </b>
          <span className="text-xs" style={{ color: "var(--potter-subtext0)" }}>{p.blurb}</span>
        </a>
      ))}
    </div>
  );
}
