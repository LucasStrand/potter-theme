// Paste Hotel front desk: a room number (and its key, if the room is locked) gets you the paste.
// POST rather than GET so keys never end up in URLs or logs.

import { NextResponse } from "next/server";
import { formatRoom, MAX_KEY_LENGTH, parseRoom } from "../../../lib/paste-hotel";
import { admit, hotelConfigured, openRoom } from "../../../lib/paste-hotel.server";

export async function POST(request: Request) {
  if (!hotelConfigured()) {
    return NextResponse.json({ error: "The hotel is closed — no database is configured." }, { status: 503 });
  }
  const input = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const room = typeof input.room === "string" ? parseRoom(input.room) : null;
  if (!room) {
    return NextResponse.json({ error: "Room numbers are six digits." }, { status: 400 });
  }
  const key = typeof input.key === "string" && input.key ? input.key.slice(0, MAX_KEY_LENGTH) : null;

  if (!(await admit(request, "open", 30, 60))) {
    return NextResponse.json({ error: "Too many doors tried from here. Wait a minute." }, { status: 429 });
  }
  const result = await openRoom(room, key);
  switch (result.status) {
    case "vacant":
      return NextResponse.json({ error: `Nobody's staying in room ${formatRoom(room)}.` }, { status: 404 });
    case "locked":
      return NextResponse.json({ locked: true, error: "This room is locked. Enter its key." }, { status: 401 });
    case "wrong-key":
      return NextResponse.json({ locked: true, error: "That key doesn't fit." }, { status: 403 });
    case "ok":
      return NextResponse.json({
        room,
        body: result.body,
        checkout: result.checkout,
        locked: result.locked,
        burn: result.burn,
        files: result.files,
      });
  }
}
