# Potter for Neovim

Three flavors (`parchment`, `quill`, `ink`) with Treesitter, LSP semantic tokens,
and common plugin highlights (telescope, nvim-cmp, gitsigns).

## Install

**lazy.nvim**
```lua
{ "potter-theme/potter", name = "potter", lazy = false, priority = 1000,
  config = function() require("potter").load("quill") end }
```
The plugin dir is `ports/nvim/` — point your plugin manager at the repo with this
subdirectory on the runtimepath (or copy `ports/nvim/{colors,lua}` into your config).

## Use

```lua
require("potter").load("quill")   -- parchment | quill | ink
```
or
```vim
:colorscheme potter-quill
```
With no argument, `load()` picks `parchment` when `background=light`, else `quill`.

The colorscheme also sets `vim.g.terminal_color_0..15` so `:terminal` matches.

## Regenerating

The per-flavor palette tables in `lua/potter/palettes/` are generated from
`palette.json` (`npm run generate`). Highlight groups live in
`lua/potter/groups.lua` — edit those by hand, not the palettes.
