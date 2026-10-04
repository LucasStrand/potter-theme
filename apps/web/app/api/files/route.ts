// Records a file a tool has just uploaded. The blob is looked up in our own store rather
// than trusting the client's word for its size, type, or location.

import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db, isToolId, storageConfigured } from "../../lib/tool-files.server";

export async function POST(request: Request) {
  if (!storageConfigured()) {
    return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  }
  const { tool, name, url } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isToolId(tool) || typeof url !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let blob;
  try {
    blob = await head(url);
  } catch {
    return NextResponse.json({ error: "Unknown blob" }, { status: 400 });
  }
  if (!blob.pathname.startsWith(`${tool}/`)) {
    return NextResponse.json({ error: "Blob does not belong to this tool" }, { status: 400 });
  }

  const sql = await db();
  await sql`
    INSERT INTO tool_files (tool, name, pathname, url, content_type, size)
    VALUES (${tool}, ${name.slice(0, 255)}, ${blob.pathname}, ${blob.url}, ${blob.contentType}, ${blob.size})
    ON CONFLICT (pathname) DO NOTHING`;
  return NextResponse.json({ ok: true }, { status: 201 });
}
