/**
 * Multi-theme palette registry for the wallpaper studio (/tools/wallpaper-converter).
 *
 * Each theme has one or more flavors. A flavor carries two things:
 *   - `palette`: the list of target colors the recolor LUT maps an image onto.
 *   - `ui`: tokens used to dress the studio page in that flavor while it's selected.
 *
 * Potter is sourced from the live palette.json so it never drifts; the rest are the
 * canonical published hexes of each project (Catppuccin, Gruvbox, Dracula, Nord,
 * Tokyo Night, Rosé Pine).
 */
import type { RGB } from "./wallpaper";
import { palette, ACCENTS, NEUTRALS } from "./palette";

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const relLum = ({ r, g, b }: RGB) => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** A readable near-black / near-white to sit on top of an accent button. */
export const readableOn = (hex: string): string => (relLum(hexToRgb(hex)) > 0.45 ? "#10100c" : "#f7f5ef");

export interface FlavorUI {
  bg: string;
  bgAlt: string;
  panel: string;
  panelBorder: string;
  text: string;
  subtext: string;
  faint: string;
  accent: string;
}

export interface ThemeFlavor {
  id: string;
  label: string;
  dark: boolean;
  ui: FlavorUI;
  /** Recolor targets as hex; converted to RGB on demand via `flavorTargets`. */
  palette: string[];
}

export interface Theme {
  id: string;
  label: string;
  flavors: ThemeFlavor[];
}

export const flavorTargets = (f: ThemeFlavor): RGB[] => f.palette.map(hexToRgb);

// --- Potter (authoritative, from palette.json) ---------------------------------
const potterFlavor = (id: "parchment" | "quill" | "ink", label: string): ThemeFlavor => {
  const c = palette[id].colors;
  const hex = (n: string) => c[n].hex;
  return {
    id: `potter-${id}`,
    label,
    dark: palette[id].dark,
    ui: {
      bg: hex("base"),
      bgAlt: hex("mantle"),
      panel: hex("surface0"),
      panelBorder: hex("surface1"),
      text: hex("text"),
      subtext: hex("subtext0"),
      faint: hex("overlay1"),
      accent: hex("peach"),
    },
    palette: [...ACCENTS, ...NEUTRALS].map(hex),
  };
};

export const THEMES: Theme[] = [
  {
    id: "potter",
    label: "Potter",
    flavors: [potterFlavor("parchment", "Parchment"), potterFlavor("quill", "Quill"), potterFlavor("ink", "Ink")],
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    flavors: [
      {
        id: "catppuccin-latte",
        label: "Latte",
        dark: false,
        ui: { bg: "#eff1f5", bgAlt: "#e6e9ef", panel: "#ccd0da", panelBorder: "#bcc0cc", text: "#4c4f69", subtext: "#6c6f85", faint: "#8c8fa1", accent: "#8839ef" },
        palette: ["#dc8a78","#dd7878","#ea76cb","#8839ef","#d20f39","#e64553","#fe640b","#df8e1d","#40a02b","#179299","#04a5e5","#209fb5","#1e66f5","#7287fd","#4c4f69","#5c5f77","#6c6f85","#7c7f93","#8c8fa1","#9ca0b0","#acb0be","#bcc0cc","#ccd0da","#eff1f5","#e6e9ef","#dce0e8"],
      },
      {
        id: "catppuccin-frappe",
        label: "Frappé",
        dark: true,
        ui: { bg: "#303446", bgAlt: "#292c3c", panel: "#414559", panelBorder: "#51576d", text: "#c6d0f5", subtext: "#a5adce", faint: "#838ba7", accent: "#ca9ee6" },
        palette: ["#f2d5cf","#eebebe","#f4b8e4","#ca9ee6","#e78284","#ea999c","#ef9f76","#e5c890","#a6d189","#81c8be","#99d1db","#85c1dc","#8caaee","#babbf1","#c6d0f5","#b5bfe2","#a5adce","#949cbb","#838ba7","#737994","#626880","#51576d","#414559","#303446","#292c3c","#232634"],
      },
      {
        id: "catppuccin-macchiato",
        label: "Macchiato",
        dark: true,
        ui: { bg: "#24273a", bgAlt: "#1e2030", panel: "#363a4f", panelBorder: "#494d64", text: "#cad3f5", subtext: "#a5adcb", faint: "#8087a2", accent: "#c6a0f6" },
        palette: ["#f4dbd6","#f0c6c6","#f5bde6","#c6a0f6","#ed8796","#ee99a0","#f5a97f","#eed49f","#a6da95","#8bd5ca","#91d7e3","#7dc4e4","#8aadf4","#b7bdf8","#cad3f5","#b8c0e0","#a5adcb","#939ab7","#8087a2","#6e738d","#5b6078","#494d64","#363a4f","#24273a","#1e2030","#181926"],
      },
      {
        id: "catppuccin-mocha",
        label: "Mocha",
        dark: true,
        ui: { bg: "#1e1e2e", bgAlt: "#181825", panel: "#313244", panelBorder: "#45475a", text: "#cdd6f4", subtext: "#a6adc8", faint: "#7f849c", accent: "#cba6f7" },
        palette: ["#f5e0dc","#f2cdcd","#f5c2e7","#cba6f7","#f38ba8","#eba0ac","#fab387","#f9e2af","#a6e3a1","#94e2d5","#89dceb","#74c7ec","#89b4fa","#b4befe","#cdd6f4","#bac2de","#a6adc8","#9399b2","#7f849c","#6c7086","#585b70","#45475a","#313244","#1e1e2e","#181825","#11111b"],
      },
    ],
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    flavors: [
      {
        id: "gruvbox-dark",
        label: "Dark",
        dark: true,
        ui: { bg: "#282828", bgAlt: "#1d2021", panel: "#3c3836", panelBorder: "#504945", text: "#ebdbb2", subtext: "#d5c4a1", faint: "#928374", accent: "#fe8019" },
        palette: ["#fb4934","#fe8019","#fabd2f","#b8bb26","#8ec07c","#83a598","#d3869b","#cc241d","#d65d0e","#98971a","#458588","#b16286","#689d6a","#ebdbb2","#d5c4a1","#bdae93","#a89984","#928374","#7c6f64","#665c54","#504945","#3c3836","#282828","#1d2021"],
      },
      {
        id: "gruvbox-light",
        label: "Light",
        dark: false,
        ui: { bg: "#fbf1c7", bgAlt: "#f2e5bc", panel: "#ebdbb2", panelBorder: "#d5c4a1", text: "#3c3836", subtext: "#504945", faint: "#7c6f64", accent: "#af3a03" },
        palette: ["#9d0006","#af3a03","#b57614","#79740e","#427b58","#076678","#8f3f71","#cc241d","#d65d0e","#d79921","#98971a","#458588","#b16286","#3c3836","#504945","#665c54","#7c6f64","#928374","#a89984","#bdae93","#d5c4a1","#ebdbb2","#f2e5bc","#fbf1c7"],
      },
    ],
  },
  {
    id: "dracula",
    label: "Dracula",
    flavors: [
      {
        id: "dracula",
        label: "Dracula",
        dark: true,
        ui: { bg: "#282a36", bgAlt: "#21222c", panel: "#343746", panelBorder: "#44475a", text: "#f8f8f2", subtext: "#c8cadb", faint: "#6272a4", accent: "#bd93f9" },
        palette: ["#ff5555","#ffb86c","#f1fa8c","#50fa7b","#8be9fd","#bd93f9","#ff79c6","#6272a4","#f8f8f2","#c8cadb","#9a9cb5","#44475a","#343746","#282a36","#21222c","#191a21"],
      },
    ],
  },
  {
    id: "nord",
    label: "Nord",
    flavors: [
      {
        id: "nord",
        label: "Nord",
        dark: true,
        ui: { bg: "#2e3440", bgAlt: "#272b35", panel: "#3b4252", panelBorder: "#434c5e", text: "#eceff4", subtext: "#d8dee9", faint: "#7b88a1", accent: "#88c0d0" },
        palette: ["#8fbcbb","#88c0d0","#81a1c1","#5e81ac","#bf616a","#d08770","#ebcb8b","#a3be8c","#b48ead","#eceff4","#e5e9f0","#d8dee9","#9aa3b5","#4c566a","#434c5e","#3b4252","#2e3440","#272b35"],
      },
    ],
  },
  {
    id: "tokyonight",
    label: "Tokyo Night",
    flavors: [
      {
        id: "tokyonight",
        label: "Tokyo Night",
        dark: true,
        ui: { bg: "#1a1b26", bgAlt: "#16161e", panel: "#24283b", panelBorder: "#2f334d", text: "#c0caf5", subtext: "#9aa5ce", faint: "#565f89", accent: "#7aa2f7" },
        palette: ["#7aa2f7","#7dcfff","#9ece6a","#73daca","#bb9af7","#9d7cd8","#f7768e","#ff9e64","#e0af68","#1abc9c","#c0caf5","#a9b1d6","#9aa5ce","#565f89","#414868","#24283b","#1a1b26","#16161e"],
      },
    ],
  },
  {
    id: "rosepine",
    label: "Rosé Pine",
    flavors: [
      {
        id: "rosepine",
        label: "Rosé Pine",
        dark: true,
        ui: { bg: "#191724", bgAlt: "#1f1d2e", panel: "#26233a", panelBorder: "#2a283e", text: "#e0def4", subtext: "#908caa", faint: "#6e6a86", accent: "#c4a7e7" },
        palette: ["#eb6f92","#f6c177","#ebbcba","#31748f","#9ccfd8","#c4a7e7","#e0def4","#cdcbe0","#908caa","#6e6a86","#524f67","#403d52","#26233a","#1f1d2e","#191724"],
      },
      {
        id: "rosepine-dawn",
        label: "Dawn",
        dark: false,
        ui: { bg: "#faf4ed", bgAlt: "#fffaf3", panel: "#f2e9e1", panelBorder: "#dfdad9", text: "#575279", subtext: "#797593", faint: "#9893a5", accent: "#907aa9" },
        palette: ["#b4637a","#ea9d34","#d7827e","#286983","#56949f","#907aa9","#575279","#6e6a86","#797593","#9893a5","#cecacd","#dfdad9","#f2e9e1","#fffaf3","#faf4ed"],
      },
    ],
  },
];

export const ALL_FLAVORS = THEMES.flatMap((t) => t.flavors);
export const findFlavor = (id: string) => ALL_FLAVORS.find((f) => f.id === id) ?? THEMES[0].flavors[1];
export const themeOf = (flavorId: string) => THEMES.find((t) => t.flavors.some((f) => f.id === flavorId)) ?? THEMES[0];
