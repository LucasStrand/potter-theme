# Potter Style Guide

Potter is a warm **paper & ink** color theme. It comes in three flavors and a
fixed set of 26 named colors per flavor, so that a Potter port looks like Potter
everywhere — a website, a Neovim buffer, a terminal, a VS Code window.

This guide is the contract every port (official or community) follows.

## Flavors

| Flavor | Mode | Base | Use it for |
|--------|------|------|-----------|
| **Potter Parchment** | light | `#faf9f5` | daylight, print-like reading, light-mode UIs |
| **Potter Quill** | dark | `#1c1812` | the default dark flavor — warm, mid-depth |
| **Potter Ink** | dark | `#14110c` | the deepest dark — OLED, low-light, high focus |

The **default accent is `peach`** (the terracotta signature). When a port needs a
single highlight color and the user hasn't chosen one, use `peach`.

## The 26 colors

Every flavor defines the same 26 names. 14 are **hues** (`accent: true`), 12 are
**neutrals**. Never invent a color outside this set; never hardcode a hex — pull
from `palette.json`.

### Neutrals (structure & type)

From background to foreground:

| Name | Role |
|------|------|
| `crust` | deepest edge — window border, the layer behind `mantle` |
| `mantle` | secondary background — sidebars, status bars, insets |
| `base` | **primary background** — the canvas |
| `surface0` | UI surfaces — cards, hovered rows, code blocks |
| `surface1` | raised surfaces, selections, active line |
| `surface2` | highest surface, drag handles, scrollbar thumb |
| `overlay0` | muted lines — borders, indent guides, line numbers |
| `overlay1` | muted text — comments, disabled labels |
| `overlay2` | brighter muted — punctuation, separators |
| `subtext0` | secondary text |
| `subtext1` | secondary text (stronger) |
| `text` | **primary text** |

Contrast: `text` clears WCAG AA (≥ 4.5) on `base`, `mantle`, and `surface0` in all
three flavors. `subtext1` clears AA on `base`; `subtext0` clears AA-large (≥ 3.0).

### Hues (accents & syntax)

| Name | Meaning / typical syntax use |
|------|------|
| `rosewater` | soft highlight, cursor accents |
| `flamingo` | soft highlight alt |
| `pink` | string escapes, regex, embedded |
| `mauve` | keywords, control flow, storage |
| `red` | **errors**, deletions, invalid |
| `maroon` | parameters, builtin variables |
| `peach` | **primary accent**, numbers, constants, booleans, links-on-accent |
| `yellow` | **warnings**, types, classes, attributes, search |
| `green` | **success**, strings, additions |
| `teal` | hints, escapes alt, success alt |
| `sky` | operators, info diagnostics, links |
| `sapphire` | properties, fields |
| `blue` | **functions**, methods |
| `lavender` | namespaces alt, special identifiers |

Every hue clears ≥ 3.0 contrast on its flavor's `base`, so all are safe for
syntax tokens and UI components. (Light-flavor warm hues are intentionally a touch
deeper than their dark-flavor counterparts to meet this floor.)

## Accent guidance

- **Light vs dark:** the same hue is deeper in Parchment and more pastel in Quill/
  Ink. Always read the color from the flavor you're rendering — don't reuse a dark
  hue on a light background.
- **Semantic colors are fixed:** `red` = error, `yellow` = warning, `green` =
  success, `sky` = info. Don't repurpose them.
- **One accent at a time:** UI chrome (active tab, focus ring, primary button)
  should use a single accent, `peach` by default.

## Naming

- Brand: **Potter** (the ecosystem). Flavors are ink/paper themed: **Parchment**,
  **Quill**, **Ink**. A user writes a flavor as e.g. `Potter Quill`; the machine id
  is the lowercase single word (`quill`).
- Port packages are `@potter/<port>` (npm) or `potter-<port>` where a registry has
  no scopes. Generated files are named `potter-<flavor>.<ext>`.

## For port authors

1. Add a template under `ports/<your-port>/templates/*.pottertmpl`.
2. Reference colors as `{{peach.hex}}`, `{{base.rgb.r}}`, etc. — never literal hex.
3. Run `npm run generate`. Commit both the template and its generated output.
4. CI runs `npm run generate -- --check`; drift fails the build.

See `generator/src/render.ts` for the full template syntax (helpers `mix`,
`lighten`, `darken`, `alpha`, `rgb`, `bare`; blocks `#each`, `#if`, `#unless`).
