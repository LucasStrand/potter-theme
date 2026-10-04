// Issues short-lived client tokens so tools can upload straight from the browser to the
// private Blob store. Each tool may only write under its own folder.

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isToolId, MAX_FILE_BYTES, storageConfigured } from "../../../lib/tool-files.server";
import type { ToolId } from "../../../lib/tool-ids";

// 3D files arrive with all sorts of (or no) MIME types, so that tool is left unrestricted.
const ALLOWED_TYPES: Record<ToolId, string[] | undefined> = {
  "wallpaper-studio": ["image/*"],
  "background-remover": ["image/*"],
  "svg-png": ["image/svg+xml", "text/plain", "text/xml", "application/xml"],
  "3d-viewer": undefined,
};

export async function POST(request: Request) {
  if (!storageConfigured()) {
    return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { tool } = JSON.parse(clientPayload ?? "{}") as { tool?: unknown };
        if (!isToolId(tool) || !pathname.startsWith(`${tool}/`)) {
          throw new Error("Unknown tool or path");
        }
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_BYTES,
          allowedContentTypes: ALLOWED_TYPES[tool],
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
