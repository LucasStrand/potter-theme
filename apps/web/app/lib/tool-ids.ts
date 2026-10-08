// Which tools store their files, shared by the browser helper and the server routes.

export const TOOL_IDS = ["wallpaper-studio", "background-remover", "svg-png", "3d-viewer", "paste-hotel"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const TOOL_LABEL: Record<ToolId, string> = {
  "wallpaper-studio": "Wallpaper Studio",
  "background-remover": "Background Remover",
  "svg-png": "SVG → PNG",
  "3d-viewer": "3D Viewer",
  "paste-hotel": "Paste Hotel",
};
