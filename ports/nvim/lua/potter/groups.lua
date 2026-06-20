-- Potter — highlight group definitions (shared across all flavors).
-- Colors come from the generated palette table `p`; this file is hand-written
-- so the semantic mapping lives in one place.
local M = {}

function M.get(p)
  return {
    -- editor ui
    Normal = { fg = p.text, bg = p.base },
    NormalFloat = { fg = p.text, bg = p.mantle },
    FloatBorder = { fg = p.overlay0, bg = p.mantle },
    Cursor = { fg = p.base, bg = p.peach },
    CursorLine = { bg = p.surface0 },
    CursorLineNr = { fg = p.peach, bold = true },
    LineNr = { fg = p.overlay0 },
    SignColumn = { bg = p.base },
    ColorColumn = { bg = p.surface0 },
    Visual = { bg = p.surface2 },
    Search = { fg = p.base, bg = p.yellow },
    IncSearch = { fg = p.base, bg = p.peach },
    Pmenu = { fg = p.subtext1, bg = p.surface0 },
    PmenuSel = { fg = p.text, bg = p.surface2, bold = true },
    StatusLine = { fg = p.subtext1, bg = p.mantle },
    WinSeparator = { fg = p.surface1 },
    MatchParen = { fg = p.peach, bold = true },
    Whitespace = { fg = p.surface1 },
    Comment = { fg = p.overlay1, italic = true },

    -- syntax (legacy groups; treesitter below)
    Constant = { fg = p.peach },
    String = { fg = p.green },
    Character = { fg = p.green },
    Number = { fg = p.peach },
    Boolean = { fg = p.peach },
    Function = { fg = p.blue },
    Identifier = { fg = p.text },
    Keyword = { fg = p.mauve },
    Statement = { fg = p.mauve },
    Operator = { fg = p.sky },
    Type = { fg = p.yellow },
    PreProc = { fg = p.pink },
    Special = { fg = p.peach },
    Error = { fg = p.red },
    Todo = { fg = p.base, bg = p.yellow, bold = true },

    -- diagnostics
    DiagnosticError = { fg = p.red },
    DiagnosticWarn = { fg = p.yellow },
    DiagnosticInfo = { fg = p.sky },
    DiagnosticHint = { fg = p.teal },
    DiagnosticOk = { fg = p.green },

    -- git
    DiffAdd = { fg = p.green },
    DiffChange = { fg = p.yellow },
    DiffDelete = { fg = p.red },
    GitSignsAdd = { fg = p.green },
    GitSignsChange = { fg = p.yellow },
    GitSignsDelete = { fg = p.red },

    -- treesitter
    ["@variable"] = { fg = p.text },
    ["@variable.builtin"] = { fg = p.maroon },
    ["@function"] = { fg = p.blue },
    ["@function.builtin"] = { fg = p.peach },
    ["@function.call"] = { fg = p.blue },
    ["@method"] = { fg = p.blue },
    ["@keyword"] = { fg = p.mauve },
    ["@keyword.function"] = { fg = p.mauve },
    ["@keyword.return"] = { fg = p.mauve },
    ["@conditional"] = { fg = p.mauve },
    ["@repeat"] = { fg = p.mauve },
    ["@string"] = { fg = p.green },
    ["@string.escape"] = { fg = p.pink },
    ["@number"] = { fg = p.peach },
    ["@boolean"] = { fg = p.peach },
    ["@type"] = { fg = p.yellow },
    ["@type.builtin"] = { fg = p.yellow },
    ["@constant"] = { fg = p.peach },
    ["@constant.builtin"] = { fg = p.peach },
    ["@property"] = { fg = p.sapphire },
    ["@field"] = { fg = p.sapphire },
    ["@parameter"] = { fg = p.maroon },
    ["@constructor"] = { fg = p.yellow },
    ["@operator"] = { fg = p.sky },
    ["@punctuation"] = { fg = p.overlay2 },
    ["@punctuation.bracket"] = { fg = p.overlay2 },
    ["@comment"] = { fg = p.overlay1, italic = true },
    ["@tag"] = { fg = p.mauve },
    ["@tag.attribute"] = { fg = p.yellow },
    ["@tag.delimiter"] = { fg = p.overlay2 },
    ["@markup.heading"] = { fg = p.peach, bold = true },
    ["@markup.link"] = { fg = p.sky, underline = true },
    ["@markup.raw"] = { fg = p.green },

    -- lsp semantic tokens
    ["@lsp.type.namespace"] = { fg = p.yellow },
    ["@lsp.type.function"] = { fg = p.blue },
    ["@lsp.type.variable"] = { fg = p.text },
    ["@lsp.type.property"] = { fg = p.sapphire },

    -- telescope / cmp
    TelescopeBorder = { fg = p.overlay0, bg = p.mantle },
    TelescopeSelection = { bg = p.surface0, fg = p.text },
    TelescopeMatching = { fg = p.peach, bold = true },
    CmpItemAbbrMatch = { fg = p.peach, bold = true },
    CmpItemKindFunction = { fg = p.blue },
    CmpItemKindKeyword = { fg = p.mauve },
  }
end

return M
