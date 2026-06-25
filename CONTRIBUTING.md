# Contributing to Potter

Thanks for helping Potter grow. Potter is a **paper & ink** color theme with one
rule above all others: **there is a single source of truth.** Every color in
every port comes from `palette/palette.json`, which is generated from
`palette/src/colors.ts`. You never hand-edit a generated file.

Read the **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** first — it's the contract every
port follows (the 26 color names, what each means, and the default `peach` accent).

## Setup

```bash
git clone https://github.com/LucasStrand/potter-theme.git
cd potter-theme
npm install          # Node >= 22.6 — the tooling is TypeScript run natively
npm run build        # build-palette -> generate every port
npm test             # color math + palette integrity + renderer (21 tests)
npm run contrast     # WCAG ratios; fails if core text drops below AA
```

## The golden rule: never edit generated files

```
palette/src/colors.ts   <-- the ONLY place raw hex lives
        |  npm run build-palette
        v
palette/palette.json    <-- source of truth consumed by everything
        |  npm run generate  (the "Quills" template engine)
        v
ports/**/dist, ports/**/*.{lua,conf,toml,...}   <-- generated; do not hand-edit
```

If you want to change a color, edit `palette/src/colors.ts` and run `npm run build`.
CI runs `npm run generate -- --check` and **fails the PR if any generated file is
stale**, so always rebuild before committing.

## Adding a new port

A "port" turns the palette into a config another tool understands. To add one:

1. Create `ports/<name>/templates/` and write a template using the Quills syntax
   (see existing ports like `ports/terminal` or `ports/css` for examples — inline
   `{{flavor.peach}}`, `{{#each accents}}`, frontmatter for per-flavor filenames).
2. Run `npm run generate`. Your files land in `ports/<name>/`.
3. Verify against a real install of the target tool (load it, screenshot all three
   flavors: Parchment, Quill, Ink).
4. Add a row to **[PORTS.md](./PORTS.md)**.
5. Open a PR with before/after screenshots in all three flavors.

A good port:

- uses **all** applicable color names from the style guide, mapped to roles, not
  by eyeballing;
- ships every flavor (Parchment / Quill / Ink);
- never introduces a hex that isn't in the palette.

## Requesting a port (no code)

Open a **Port request** issue. Popular targets we'd love: GTK, zsh,
Discord, Firefox/Chrome, Obsidian, Zed, Helix, Sublime, Slack, Adobe `.ase`.

## Pull requests

- Keep PRs focused (one port or one concern).
- Run `npm test` and `npm run contrast` locally; both must pass.
- Run `npm run build` so generated files are current (CI enforces this).
- Be kind — see the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Reporting color problems

If a color looks wrong (contrast, muddiness, an accent that clashes), open a
**Color feedback** issue with the flavor, the color name, where you saw it, and a
screenshot. Palette changes ripple to every port, so we discuss before tuning.
