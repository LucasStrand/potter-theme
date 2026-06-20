<h1 align="center">Potter</h1>
<p align="center">A warm <strong>paper &amp; ink</strong> color theme — Catppuccin-grade, driven by one source of truth.</p>

Potter is a complete theming ecosystem: a fixed palette of **26 named colors** across
**3 flavors**, plus ports you can drop into web projects, editors, terminals, and an
Arch Linux desktop. Everything is generated from a single `palette.json`, so re-tuning
one color re-flows every port.

## Flavors

| | Flavor | Mode | Base |
|---|--------|------|------|
| 🪶 | **Potter Parchment** | light | `#faf9f5` |
| 🖋️ | **Potter Quill** | dark (default) | `#1c1812` |
| 🌑 | **Potter Ink** | dark (deepest) | `#14110c` |

Each flavor has 14 hues (`rosewater … lavender`) + 12 neutrals (`text … crust`).
See **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** for what every color means.

## Quick start

### Web (CSS)

```html
<html data-potter-flavor="quill">
<link rel="stylesheet" href="@potter/css">   <!-- ports/css/dist/potter.css -->
```
```css
.button { background: var(--potter-peach); color: var(--potter-base); }
.muted  { color: rgb(var(--potter-subtext0-rgb) / 0.8); }
```
With no `data-potter-flavor`, `:root` follows the OS light/dark preference
(Parchment / Quill). Switch at runtime by setting the attribute or a `.potter-<flavor>` class.

### Tailwind

```css
@import "@potter/css";
@import "@potter/tailwind";   /* v4: bg-potter-base, text-potter-text, border-potter-overlay0 */
```
Tailwind v3: use `ports/tailwind/dist/preset.cjs` (alpha-aware via the `-rgb` vars).

### Neovim (Arch dev)

```lua
-- lua table copy of ports/nvim/ onto your runtimepath, then:
require("potter").load("quill")   -- or :colorscheme potter-quill
```

### Terminal

Ready-made configs in `ports/terminal/{kitty,alacritty,wezterm,foot}/potter-<flavor>.*`.

### VS Code

`ports/vscode/` is a theme extension — F5 to try it, or package with `vsce`.

## Repository

```
palette/      palette.json (source of truth) + typed JS/TS bindings (@potter/palette)
generator/    Quills — the Whiskers-style template engine
lib/          zero-dependency color math (shared)
ports/        css · tailwind · nvim · terminal · vscode · xresources · gimp · tmux · json
scripts/      check-contrast.ts (WCAG gate) · build-site.ts
docs/         the website (open docs/index.html; GitHub Pages-ready)
demo/         minimal flavor-switch demo
test/         node:test suite
```

## Working on it

```bash
npm run build-palette   # rebuild palette.json + bindings from palette/src/colors.ts
npm run generate        # regenerate every port from its templates
npm run build           # both of the above
npm test                # color math + palette integrity + renderer
npm run contrast        # print WCAG ratios; fails if core text drops below AA
npm run generate -- --check   # CI: fail if any generated file is out of date
```

Requires **Node ≥ 22.6** (the tooling is TypeScript run natively — no build step,
no dependencies).

### Changing a color

Edit `palette/src/colors.ts`, then `npm run build`. That's the only place raw hex
lives — every port updates from it.

## Roadmap

**Wave 1 (done):** palette, generator, CSS/Sass, Tailwind, Neovim, terminals
(kitty/alacritty/wezterm/foot), VS Code, Xresources, GIMP, tmux, flat JSON, a
showcase **website** (`docs/`), tests + WCAG gate + CI.

**Next:** Adobe `.ase` export, more ports (GTK, zsh/starship, browsers, Discord),
and `@potter/*` npm publishing.

## License

MIT.
