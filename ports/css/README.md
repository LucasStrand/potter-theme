# @potternu/css

[Potter](https://potter.nu) as CSS custom properties — all flavors, OS light/dark
auto, runtime switching via `data-potter-flavor`.

```bash
npm i @potternu/css
```

```css
@import "@potternu/css";              /* or @potternu/css/scss for Sass */
.button { background: var(--potter-peach); color: var(--potter-base); }
```

```html
<html data-potter-flavor="quill"> <!-- parchment | quill | ink -->
```

MIT.
