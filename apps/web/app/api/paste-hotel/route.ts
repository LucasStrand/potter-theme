// Paste Hotel check-in: takes a paste, a length of stay and an optional key, hands back a room number.

import { NextResponse } from "next/server";
import { MAX_KEY_LENGTH, MAX_PASTE_BYTES, STAYS } from "../../lib/paste-hotel";
import { admit, checkIn, hotelConfigured } from "../../lib/paste-hotel.server";

export async function POST(request: Request) {
  if (!hotelConfigured()) {
    return NextResponse.json({ error: "The hotel is closed — no database is configured." }, { status: 503 });
  }
  const { body, stay, key } = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "There's nothing to check in." }, { status: 400 });
  }
  if (Buffer.byteLength(body, "utf8") > MAX_PASTE_BYTES) {
    return NextResponse.json({ error: "That won't fit — rooms hold up to 512 KB of text." }, { status: 413 });
  }
  const length = STAYS.find((s) => s.id === stay);
  if (!length) {
    return NextResponse.json({ error: "Pick a length of stay." }, { status: 400 });
  }
  if (key != null && (typeof key !== "string" || key.length > MAX_KEY_LENGTH)) {
    return NextResponse.json({ error: `Room keys are up to ${MAX_KEY_LENGTH} characters.` }, { status: 400 });
  }

  if (!(await admit(request, "check-in", 20, 10 * 60))) {
    return NextResponse.json({ error: "Too many check-ins from here. Try again in a few minutes." }, { status: 429 });
  }
  const { room, checkout } = await checkIn(body, length.seconds, key || null);
  return NextResponse.json({ room, checkout }, { status: 201 });
}
