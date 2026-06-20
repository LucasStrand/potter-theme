# Potter for terminals

Generated configs for each flavor (`parchment`, `quill`, `ink`).

## kitty
```conf
# ~/.config/kitty/kitty.conf
include potter-quill.conf
```
Copy `kitty/potter-<flavor>.conf` next to your `kitty.conf`.

## Alacritty
```toml
# ~/.config/alacritty/alacritty.toml
import = ["~/.config/alacritty/potter-quill.toml"]
```

## WezTerm
```lua
config.colors = require("potter-quill")  -- put potter-<flavor>.lua on package.path
```

## foot
```ini
# ~/.config/foot/foot.ini
[main]
include=~/.config/foot/potter-quill.ini
```

All files are generated from the ANSI map in `palette.json` (`npm run generate`).
