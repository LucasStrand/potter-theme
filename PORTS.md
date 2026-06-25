# Potter ports

Every port is generated from `palette/palette.json` and ships all three flavors —
**Parchment** (light), **Quill** (dark, default), and **Ink** (deepest dark).
"Stable" means it's verified to render; help us promote the ones marked _needs
live check_ by testing them and posting screenshots.

To request a target that isn't here, open a [Port request](https://github.com/LucasStrand/potter-theme/issues/new?template=port_request.yml).

## Available

| Port | Path | Format | Status |
|------|------|--------|--------|
| **CSS / Sass** | `ports/css` | CSS custom properties + `data-potter-flavor`; `_potter.scss` | Stable |
| **Tailwind** | `ports/tailwind` | v4 `@theme` + v3 preset (`dist/preset.cjs`) | Stable |
| **Neovim** | `ports/nvim` | Lua colorscheme (`require("potter").load(...)`) | needs live check |
| **kitty** | `ports/terminal/kitty` | `.conf` | needs live check |
| **Alacritty** | `ports/terminal/alacritty` | `.toml` | needs live check |
| **WezTerm** | `ports/terminal/wezterm` | `.lua` | needs live check |
| **foot** | `ports/terminal/foot` | `.ini` | needs live check |
| **Windows Terminal** | `ports/windows-terminal` | `.json` schemes (3 flavors) | Stable |
| **Starship** | `ports/starship` | `.toml` (`[palettes.potter]` + themed prompt) | needs live check |
| **Windows (desktop theme)** | `ports/windows-theme` | `Apply-Potter.ps1` (registry accent + dark/light) + `.theme` gallery files | Stable |
| **Hyprland** | `ports/hyprland` | `.conf` color vars | Stable |
| **Waybar** | `ports/waybar` | `.css` (@define-color) | Stable |
| **rofi** | `ports/rofi` | `.rasi` theme | Stable |
| **mako** | `ports/mako` | `.ini` config | Stable |
| **VS Code** | `ports/vscode` | theme extension (`themes/*.json`) | needs live check |
| **Xresources** | `ports/xresources` | `.Xresources` | Stable |
| **GIMP** | `ports/gimp` | `.gpl` palette | Stable |
| **tmux** | `ports/tmux` | `.tmux` status theme | Stable |
| **JSON tokens** | `ports/json` | flat design-token JSON | Stable |

## Wanted

Open or upvote a [Port request](https://github.com/LucasStrand/potter-theme/issues/new?template=port_request.yml):

GTK · zsh · Discord (BetterDiscord/Vencord) · Firefox · Chrome ·
Obsidian · Zed · Helix · Sublime Text · Slack · Adobe `.ase` ·
Warp · Ghostty · Spotify (Spicetify)

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for how to build one — it's a template
plus `npm run generate`.
