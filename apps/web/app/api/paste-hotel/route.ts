// Paste Hotel check-in: takes text and/or files the browser already uploaded, a length of stay,
// an optional key, "check out after the first visit" and "keep a copy" — hands back a room number.
// Uploads from a check-in that's turned away are thrown out again.

import { NextResponse } from "next/server";
import { MAX_KEY_LENGTH, MAX_PASTE_BYTES, MAX_ROOM_FILE_BYTES, MAX_ROOM_FILES, STAYS } from "../../lib/paste-hotel";
import {
  admit,
  blobConfigured,
  checkIn,
  discardUploads,
  hotelConfigured,
  resolveUploads,
} from "../../lib/paste-hotel.server";

const refuse = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!hotelConfigured()) return refuse("The hotel is closed — no database is configured.", 503);
  const { body, files, stay, key, burn, keep } = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  const uploads = Array.isArray(files)
    ? files.filter((f): f is { url: string; name: string } => typeof f?.url === "string" && typeof f?.name === "string")
    : [];
  const urls = [...new Set(uploads.map((u) => u.url))];
  // Every refusal past this point also throws away what the browser already uploaded.
  const turnAway = async (error: string, status: number) => {
    await discardUploads(urls);
    return refuse(error, status);
  };

  if (files != null && (!Array.isArray(files) || uploads.length !== files.length)) return turnAway("Those files didn't arrive properly.", 400);
  if (urls.length > MAX_ROOM_FILES) return turnAway(`A room holds up to ${MAX_ROOM_FILES} files.`, 400);
  if (body != null && typeof body !== "string") return turnAway("Text must be text.", 400);
  const text = typeof body === "string" && body.trim() ? body : "";
  if (!text && !urls.length) return turnAway("There's nothing to check in.", 400);
  if (Buffer.byteLength(text, "utf8") > MAX_PASTE_BYTES) return turnAway("That won't fit — rooms hold up to 512 KB of text.", 413);
  const length = STAYS.find((s) => s.id === stay);
  if (!length) return turnAway("Pick a length of stay.", 400);
  if (key != null && (typeof key !== "string" || key.length > MAX_KEY_LENGTH)) {
    return turnAway(`Room keys are up to ${MAX_KEY_LENGTH} characters.`, 400);
  }
  if ((burn != null && typeof burn !== "boolean") || (keep != null && typeof keep !== "boolean")) {
    return turnAway("Bad request.", 400);
  }

  if (!(await admit(request, "check-in", 20, 10 * 60))) {
    return turnAway("Too many check-ins from here. Try again in a few minutes.", 429);
  }

  let roomFiles: Awaited<ReturnType<typeof resolveUploads>> = [];
  if (urls.length) {
    if (!blobConfigured()) return turnAway("File storage isn't set up, so rooms take text only.", 503);
    roomFiles = await resolveUploads(urls.map((url) => ({ url, name: uploads.find((u) => u.url === url)!.name })));
    if (!roomFiles) return turnAway("Those files didn't arrive properly. Attach them again.", 400);
    if (roomFiles.reduce((n, f) => n + f.size, 0) > MAX_ROOM_FILE_BYTES) {
      return turnAway("That won't fit — a room's files can add up to 25 MB.", 413);
    }
  }

  const { room, checkout } = await checkIn({
    body: text,
    files: roomFiles,
    staySeconds: length.seconds,
    key: key || null,
    burn: burn === true,
    // Potter keeps what it's given unless the guest switched that off.
    keep: keep !== false,
  });
  return NextResponse.json({ room, checkout }, { status: 201 });
}
