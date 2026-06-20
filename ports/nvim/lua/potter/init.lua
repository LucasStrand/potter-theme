-- Potter — Neovim colorscheme entry point.
--   require("potter").load("quill")   -- or "parchment" / "ink"
-- or set background and use :colorscheme potter-quill (see colors/).
local M = {}

local valid = { parchment = true, quill = true, ink = true }

function M.load(flavor)
  flavor = flavor or (vim.o.background == "light" and "parchment" or "quill")
  if not valid[flavor] then
    vim.notify("potter: unknown flavor '" .. tostring(flavor) .. "'", vim.log.levels.ERROR)
    return
  end

  if vim.g.colors_name then
    vim.cmd("hi clear")
  end
  vim.g.colors_name = "potter-" .. flavor
  vim.o.termguicolors = true
  vim.o.background = (flavor == "parchment") and "light" or "dark"

  local palette = require("potter.palettes." .. flavor)
  local groups = require("potter.groups").get(palette)

  for name, spec in pairs(groups) do
    vim.api.nvim_set_hl(0, name, spec)
  end

  -- expose the 16 terminal colors to :terminal
  vim.g.terminal_color_0 = palette.surface1
  vim.g.terminal_color_8 = palette.surface2
  vim.g.terminal_color_1 = palette.red
  vim.g.terminal_color_9 = palette.red
  vim.g.terminal_color_2 = palette.green
  vim.g.terminal_color_10 = palette.green
  vim.g.terminal_color_3 = palette.yellow
  vim.g.terminal_color_11 = palette.yellow
  vim.g.terminal_color_4 = palette.blue
  vim.g.terminal_color_12 = palette.blue
  vim.g.terminal_color_5 = palette.mauve
  vim.g.terminal_color_13 = palette.mauve
  vim.g.terminal_color_6 = palette.teal
  vim.g.terminal_color_14 = palette.teal
  vim.g.terminal_color_7 = palette.subtext1
  vim.g.terminal_color_15 = palette.subtext0
end

-- Allow `require("potter").palettes.quill`
M.palettes = setmetatable({}, {
  __index = function(_, k)
    return require("potter.palettes." .. k)
  end,
})

return M
