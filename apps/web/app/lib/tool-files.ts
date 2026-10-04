"use client";
// Client side of tool file storage: every tool hands the files it was given to saveToolFile.
// The bytes go straight from the browser to Vercel Blob (no serverless body-size limit),
// then /api/files records the row. Saving is fire-and-forget — a storage hiccup never gets
// in the way of the tool itself.

import { upload } from "@vercel/blob/client";
import type { ToolId } from "./tool-ids";

/** Upload `file` to Potter's storage under `tool`. Resolves to false (never throws) on failure. */
export async function saveToolFile(tool: ToolId, file: File): Promise<boolean> {
  try {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
    const contentType = file.type || "application/octet-stream";
    const blob = await upload(`${tool}/${safeName}`, file, {
      access: "private",
      handleUploadUrl: "/api/files/upload",
      clientPayload: JSON.stringify({ tool }),
      contentType,
      multipart: file.size > 8 * 1024 * 1024,
    });
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool, name: file.name, url: blob.url }),
    });
    return res.ok;
  } catch (e) {
    console.warn(`[potter] couldn't save ${file.name} for ${tool}`, e);
    return false;
  }
}

export function saveToolFiles(tool: ToolId, files: Iterable<File>): void {
  for (const f of files) void saveToolFile(tool, f);
}
