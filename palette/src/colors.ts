/**
 * Potter palette — hand-authored source hex values.
 * This is the ONLY place raw hex is authored. `build.ts` derives rgb/hsl,
 * accent flags, and the ANSI map from here and emits palette.json + bindings.
 *
 * 3 flavors. Each flavor: 14 named hues + 12 neutrals = 26 colors.
 * Aesthetic: warm "paper & ink". Hues are warm-shifted and
 * desaturated relative to Catppuccin; peach/yellow/green/red are exact anchors
 * taken from the source design.
 */

/** The 14 hue names that carry `accent: true`, in canonical order. */
export const ACCENTS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
] as const;

/** The 12 neutral names, lightest-type-to-darkest-edge order documented in STYLE_GUIDE. */
export const NEUTRALS = [
  "text",
  "subtext1",
  "subtext0",
  "overlay2",
  "overlay1",
  "overlay0",
  "surface2",
  "surface1",
  "surface0",
  "base",
  "mantle",
  "crust",
] as const;

export const COLOR_ORDER = [...ACCENTS, ...NEUTRALS] as const;
export type ColorName = (typeof COLOR_ORDER)[number];
export type FlavorName = "parchment" | "quill" | "ink";

export interface FlavorMeta {
  name: string;
  dark: boolean;
  order: number;
  colors: Record<ColorName, string>;
}

export const FLAVORS: Record<FlavorName, FlavorMeta> = {
  parchment: {
    name: "Potter Parchment",
    dark: false,
    order: 0,
    colors: {
      // hues (light-flavor hues deepened so each clears the 3.0 contrast floor on base)
      rosewater: "#ba8169",
      flamingo: "#bf8069",
      pink: "#c06b7a",
      mauve: "#9a6aa0",
      red: "#b02619",
      maroon: "#b5544a",
      peach: "#d77250",
      yellow: "#bd8324",
      green: "#788c5d",
      teal: "#4f8a78",
      sky: "#5a93a3",
      sapphire: "#4f86a0",
      blue: "#4a6da0",
      lavender: "#6f6aa8",
      // neutrals
      text: "#141413",
      subtext1: "#6b6357",
      subtext0: "#897f6d",
      overlay2: "#a89e8c",
      overlay1: "#b0a48c",
      overlay0: "#c3b7a0",
      surface2: "#d6cab4",
      surface1: "#e3dacc",
      surface0: "#ece6da",
      base: "#faf9f5",
      mantle: "#f2eee4",
      crust: "#e9e1d1",
    },
  },
  quill: {
    name: "Potter Quill",
    dark: true,
    order: 1,
    colors: {
      rosewater: "#e8cfc0",
      flamingo: "#e3b9a6",
      pink: "#dba8b0",
      mauve: "#c2a3c8",
      red: "#d77b6e",
      maroon: "#cf8f7f",
      peach: "#e08a6a",
      yellow: "#e0b25a",
      green: "#9cb07d",
      teal: "#84b3a4",
      sky: "#8fbac4",
      sapphire: "#7faec0",
      blue: "#8aa6c8",
      lavender: "#b3b0d4",
      text: "#efe9df",
      subtext1: "#c8bca4",
      subtext0: "#a99e8d",
      overlay2: "#8f7f64",
      overlay1: "#786850",
      overlay0: "#5b4e3a",
      surface2: "#453829",
      surface1: "#362c20",
      surface0: "#2a2218",
      base: "#1c1812",
      mantle: "#17140f",
      crust: "#120f0a",
    },
  },
  ink: {
    name: "Potter Ink",
    dark: true,
    order: 2,
    colors: {
      rosewater: "#ead0c1",
      flamingo: "#e5bba8",
      pink: "#dcaab2",
      mauve: "#c4a5ca",
      red: "#d87d70",
      maroon: "#d19181",
      peach: "#e28c6c",
      yellow: "#e2b45c",
      green: "#9eb27f",
      teal: "#86b5a6",
      sky: "#91bcc6",
      sapphire: "#81b0c2",
      blue: "#8ca8ca",
      lavender: "#b5b2d6",
      text: "#ece6da",
      subtext1: "#c3b79f",
      subtext0: "#a39884",
      overlay2: "#88795e",
      overlay1: "#6e6049",
      overlay0: "#524634",
      surface2: "#3b3122",
      surface1: "#2e261b",
      surface0: "#221c14",
      base: "#14110c",
      mantle: "#0f0c08",
      crust: "#0a0806",
    },
  },
};

/**
 * ANSI 16-color terminal mapping, expressed as references to color names.
 * Index 0-7 normal, 8-15 bright. Colored slots share hue across normal/bright
 * (a common, legible convention); only black/white differ.
 */
export const ANSI_MAP: { name: string; normal: ColorName; bright: ColorName; code: number }[] = [
  { name: "black", normal: "surface1", bright: "surface2", code: 0 },
  { name: "red", normal: "red", bright: "red", code: 1 },
  { name: "green", normal: "green", bright: "green", code: 2 },
  { name: "yellow", normal: "yellow", bright: "yellow", code: 3 },
  { name: "blue", normal: "blue", bright: "blue", code: 4 },
  { name: "magenta", normal: "mauve", bright: "mauve", code: 5 },
  { name: "cyan", normal: "teal", bright: "teal", code: 6 },
  { name: "white", normal: "subtext1", bright: "subtext0", code: 7 },
];
