// Streams a stored file back to its owner. ?download=1 saves it instead of opening it.

import { get } from "@vercel/blob";
import { db, isOwner, storageConfigured, type ToolFileRow } from "../../../lib/tool-files.server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!storageConfigured() || !(await isOwner())) return new Response("Not found", { status: 404 });

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return new Response("Not found", { status: 404 });

  const sql = await db();
  const [row] = (await sql`SELECT * FROM tool_files WHERE id = ${id}`) as ToolFileRow[];
  if (!row) return new Response("Not found", { status: 404 });

  const blob = await get(row.url, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  // SVGs can carry script; never render a stored file inline as an active document.
  const inline = !download && row.content_type.startsWith("image/") && row.content_type !== "image/svg+xml";
  return new Response(blob.stream, {
    headers: {
      "content-type": row.content_type,
      "content-length": String(blob.blob.size),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "cache-control": "private, no-store",
    },
  });
}
