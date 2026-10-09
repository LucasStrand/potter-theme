// Issues short-lived client tokens so tools can upload straight from the browser to the
// private Blob store. Each tool may only write under its own folder.

import { del, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_ROOM_FILE_BYTES } from "../../../lib/paste-hotel";
import { isToolId, MAX_FILE_BYTES, storageConfigured } from "../../../lib/tool-files.server";
import type { ToolId } from "../../../lib/tool-ids";

// 3D files arrive with all sorts of (or no) MIME types, so that tool is left unrestricted;
// Paste Hotel carries whatever a guest brings.
const ALLOWED_TYPES: Record<ToolId, string[] | undefined> = {
  "wallpaper-studio": ["image/*"],
  "background-remover": ["image/*"],
  "image-compressor": ["image/*"],
  "svg-png": ["image/svg+xml", "text/plain", "text/xml", "application/xml"],
  "3d-viewer": undefined,
  "paste-hotel": undefined,
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
        // Paste Hotel puts each upload in its own random folder, so the guest's file name
        // survives intact for the visitor's download.
        const hotel = tool === "paste-hotel";
        return {
          addRandomSuffix: !hotel,
          maximumSizeInBytes: hotel ? MAX_ROOM_FILE_BYTES : MAX_FILE_BYTES,
          allowedContentTypes: ALLOWED_TYPES[tool],
        };
      },
      // The token's size cap isn't enforced on multipart uploads, so weigh each upload once it
      // lands and throw away anything over its tool's limit. (Blob can only call this back on a
      // public deployment, not on localhost.)
      onUploadCompleted: async ({ blob }) => {
        const cap = blob.pathname.startsWith("paste-hotel/") ? MAX_ROOM_FILE_BYTES : MAX_FILE_BYTES;
        const { size } = await head(blob.url);
        if (size > cap) await del(blob.url);
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
