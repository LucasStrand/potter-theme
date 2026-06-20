/**
 * Quills — Potter's Whiskers-style template renderer (zero dependencies).
 *
 * A template is a text file with optional frontmatter:
 *
 *   ---
 *   filename: potter-{flavor}.json
 *   flavors: all            # or e.g. "parchment,quill"
 *   ---
 *   { "accent": "{{peach.hex}}", "bg": "{{base.hex}}" }
 *
 * The body is rendered once per selected flavor. Supported syntax inside {{ }}:
 *   {{peach}}              -> peach hex
 *   {{peach.hex}}         {{peach.rgb.r}}   {{peach.hsl.h}}
 *   {{flavor.id}}  {{flavor.name}}  {{flavor.dark}}
 *   {{mix peach base 0.2}}  {{lighten base 0.1}}  {{darken text 0.1}}
 *   {{alpha text 0.6}}      {{rgb peach}}        (-> "rgb(r, g, b)")
 *   {{#each accents}} ... {{name}} {{hex}} ... {{/each}}
 *   {{#each colors}} ...{{/each}}   {{#each ansi}} {{name}} {{normal.hex}} {{bright.hex}} {{code}} {{/each}}
 *   {{#if dark}} ... {{/if}}   {{#unless dark}} ... {{/unless}}
 */
import { hexToRgb, hexToHsl, mix, lighten, darken, alpha, rgbString } from "../../lib/color.ts";

export interface RenderColor {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  accent: boolean;
}

export interface RenderContext {
  flavor: { id: string; name: string; dark: boolean };
  colors: Record<string, RenderColor>;
  accents: RenderColor[];
  colorList: RenderColor[];
  ansi: { name: string; code: number; normal: { hex: string }; bright: { hex: string; code: number } }[];
}

type Flavor = {
  name: string;
  dark: boolean;
  colors: Record<string, { hex: string; accent: boolean }>;
  ansi: Record<string, { order: number; normal: { hex: string }; bright: { hex: string; code: number } }>;
};

/** Build the render context for one flavor from a palette.json flavor object. */
export function buildContext(id: string, flavor: Flavor): RenderContext {
  const colors: Record<string, RenderColor> = {};
  for (const [name, c] of Object.entries(flavor.colors)) {
    colors[name] = { name, hex: c.hex, rgb: hexToRgb(c.hex), hsl: hexToHsl(c.hex), accent: c.accent };
  }
  const colorList = Object.values(colors);
  const accents = colorList.filter((c) => c.accent);
  const ansi = Object.values(flavor.ansi)
    .sort((a, b) => a.order - b.order)
    .map((e) => ({
      name: Object.keys(flavor.ansi).find((k) => flavor.ansi[k] === e)!,
      code: e.order,
      normal: { hex: e.normal.hex },
      bright: { hex: e.bright.hex, code: e.bright.code },
    }));
  return {
    flavor: { id, name: flavor.name, dark: flavor.dark },
    colors,
    accents,
    colorList,
    ansi,
  };
}

const HELPERS: Record<string, (...a: string[]) => string> = {
  mix: (a, b, amt) => mix(a, b, Number(amt)),
  lighten: (a, amt) => lighten(a, Number(amt)),
  darken: (a, amt) => darken(a, Number(amt)),
  alpha: (a, amt) => alpha(a, Number(amt)),
  rgb: (a) => rgbString(a),
  bare: (a) => a.replace(/^#/, ""),
};

/** Resolve a dotted path like "peach.rgb.r" or "flavor.name" against a scope. */
function resolvePath(path: string, scope: Record<string, unknown>, ctx: RenderContext): unknown {
  const parts = path.split(".");
  let cur: unknown =
    parts[0] in scope ? scope[parts[0]] : parts[0] in ctx.colors ? ctx.colors[parts[0]] : undefined;
  if (cur === undefined && parts[0] === "flavor") cur = ctx.flavor;
  if (cur === undefined) {
    // bare flavor fields: {{dark}}, {{name}} (when not shadowed by an each item)
    const flavor = (scope.flavor as Record<string, unknown> | undefined) ?? ctx.flavor;
    if (flavor && parts[0] in flavor) cur = flavor[parts[0]];
  }
  for (let i = 1; i < parts.length && cur != null; i++) {
    cur = (cur as Record<string, unknown>)[parts[i]];
  }
  return cur;
}

/** A bare reference that lands on a color object stringifies to its hex. */
function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "hex" in (value as object)) {
    return (value as RenderColor).hex;
  }
  return String(value);
}

/** Resolve a single helper argument: a number literal, a #hex literal, or a color path -> hex. */
function resolveArg(token: string, scope: Record<string, unknown>, ctx: RenderContext): string {
  if (/^#[0-9a-fA-F]{6}$/.test(token)) return token;
  if (/^-?\d*\.?\d+$/.test(token)) return token;
  const v = resolvePath(token, scope, ctx);
  return stringify(v);
}

function evalExpr(expr: string, scope: Record<string, unknown>, ctx: RenderContext): string {
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length > 1 && tokens[0] in HELPERS) {
    const args = tokens.slice(1).map((t) => resolveArg(t, scope, ctx));
    return HELPERS[tokens[0]](...args);
  }
  return stringify(resolvePath(tokens[0], scope, ctx));
}

function truthy(name: string, scope: Record<string, unknown>, ctx: RenderContext): boolean {
  return Boolean(resolvePath(name, scope, ctx));
}

const OPEN_RE = /\{\{#(each|if|unless)\s+([\w.]+)\}\}/;

/** Find the index just past the `{{/tag}}` matching the open token at `body[from..]`, honoring nesting. */
function matchClose(body: string, tag: string, from: number): { innerStart: number; innerEnd: number; end: number } | null {
  const openTok = body.indexOf("}}", from) + 2;
  const tokenRe = /\{\{#(each|if|unless)\s+[\w.]+\}\}|\{\{\/(each|if|unless)\}\}/g;
  tokenRe.lastIndex = openTok;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(body))) {
    if (m[1]) depth++;
    else if (m[2]) {
      depth--;
      if (depth === 0) {
        return { innerStart: openTok, innerEnd: m.index, end: tokenRe.lastIndex };
      }
    }
  }
  return null;
}

/** Render a template body against a scope (recursive, supports nested blocks). */
function renderBody(body: string, scope: Record<string, unknown>, ctx: RenderContext): string {
  let out = "";
  let i = 0;
  while (i < body.length) {
    const rest = body.slice(i);
    const open = OPEN_RE.exec(rest);
    if (!open) {
      out += renderInline(rest, scope, ctx);
      break;
    }
    // inline-render the text before the block
    out += renderInline(rest.slice(0, open.index), scope, ctx);
    const absOpen = i + open.index;
    const block = matchClose(body, open[1], absOpen);
    if (!block) {
      // unmatched open; emit literally and stop block processing
      out += renderInline(body.slice(absOpen), scope, ctx);
      break;
    }
    const tag = open[1];
    const arg = open[2];
    const inner = body.slice(block.innerStart, block.innerEnd);
    if (tag === "each") {
      const list = (arg in scope ? scope[arg] : (ctx as unknown as Record<string, unknown>)[arg]) as
        | unknown[]
        | undefined;
      if (Array.isArray(list)) {
        out += list
          .map((item, idx) =>
            renderBody(
              inner,
              { ...scope, ...(item as object), ".": item, index: idx, first: idx === 0, last: idx === list.length - 1 },
              ctx,
            ),
          )
          .join("");
      }
    } else if (tag === "if") {
      if (truthy(arg, scope, ctx)) out += renderBody(inner, scope, ctx);
    } else {
      // unless
      if (!truthy(arg, scope, ctx)) out += renderBody(inner, scope, ctx);
    }
    i = block.end;
  }
  return out;
}

/** Render only inline `{{ expr }}` substitutions (no blocks). */
function renderInline(text: string, scope: Record<string, unknown>, ctx: RenderContext): string {
  return text.replace(/\{\{([^#/][^}]*?)\}\}/g, (_m, expr) => evalExpr(expr, scope, ctx));
}

export interface ParsedTemplate {
  frontmatter: Record<string, string>;
  body: string;
}

export function parseTemplate(src: string): ParsedTemplate {
  const fm: Record<string, string> = {};
  let body = src;
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^\s*([\w-]+)\s*:\s*(.*)\s*$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
    body = src.slice(m[0].length);
  }
  return { frontmatter: fm, body };
}

export function render(body: string, ctx: RenderContext): string {
  return renderBody(body, {}, ctx);
}

/** Which flavors a template targets, honoring `flavors:` frontmatter. */
export function targetFlavors(fm: Record<string, string>, all: string[]): string[] {
  if (!fm.flavors || fm.flavors === "all") return all;
  return fm.flavors.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Expand a filename pattern: {flavor} -> id, {Flavor} -> Capitalized id. */
export function expandFilename(pattern: string, flavorId: string): string {
  const cap = flavorId[0].toUpperCase() + flavorId.slice(1);
  return pattern.replace(/\{flavor\}/g, flavorId).replace(/\{Flavor\}/g, cap);
}
