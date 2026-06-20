/**
 * Potter — pure color math, zero dependencies.
 * Shared by the palette builder and the Quills generator.
 * All functions are deterministic so generated output is reproducible.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp = (n: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, n));

/** "#rrggbb" -> {r,g,b} (0-255). Accepts optional leading '#', any case. */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const channel = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, "0");

/** {r,g,b} -> "#rrggbb" (lowercase). */
export function rgbToHex({ r, g, b }: RGB): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** {r,g,b} (0-255) -> {h (0-360), s (0-100), l (0-100)} rounded. */
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex));

/** Linear blend of two hex colors. amount=0 -> a, amount=1 -> b. */
export function mix(a: string, b: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

/** Lighten toward white by amount (0-1). */
export const lighten = (hex: string, amount: number): string => mix(hex, "#ffffff", amount);
/** Darken toward black by amount (0-1). */
export const darken = (hex: string, amount: number): string => mix(hex, "#000000", amount);

/** "#rrggbb" + alpha (0-1) -> "#rrggbbaa". */
export function alpha(hex: string, a: number): string {
  const aa = channel(Math.min(1, Math.max(0, a)) * 255);
  return `${rgbToHex(hexToRgb(hex))}${aa}`;
}

/** "rgb(r, g, b)" string. */
export function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

// --- Accessibility: WCAG 2.x relative luminance + contrast ratio ---

const srgbToLinear = (c: number): number => {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance (0-1). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two colors (1.0 - 21.0). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
