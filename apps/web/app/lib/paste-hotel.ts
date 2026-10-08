// Paste Hotel (/tools/paste-hotel), the parts shared by the page and the API routes.
// A paste checks in, gets a room number short enough to read off one screen and type on
// another, and checks out by itself when its stay is up.

export const STAYS = [
  { id: "10m", label: "10 min", seconds: 10 * 60 },
  { id: "1h", label: "1 hour", seconds: 60 * 60 },
  { id: "1d", label: "1 day", seconds: 24 * 60 * 60 },
  { id: "7d", label: "7 days", seconds: 7 * 24 * 60 * 60 },
] as const;
export type StayId = (typeof STAYS)[number]["id"];
export const DEFAULT_STAY: StayId = "1d";

/** Largest paste a room holds, in UTF-8 bytes. */
export const MAX_PASTE_BYTES = 512 * 1024;

/** Longest room key accepted. */
export const MAX_KEY_LENGTH = 200;

/** Most files one room holds, and their combined size. */
export const MAX_ROOM_FILES = 10;
export const MAX_ROOM_FILE_BYTES = 25 * 1024 * 1024;

/** Where a room's uploads live in Blob: a random folder per check-in, real file names kept. */
export const ROOM_FILE_PREFIX = "paste-hotel/rooms/";

/**
 * How long download links last. A room that checks out after its first visit also stays
 * downloadable for this long once that visit has happened.
 */
export const VISIT_GRACE_SECONDS = 15 * 60;

/** "482913" → "482 913" */
export function formatRoom(room: string): string {
  return `${room.slice(0, 3)} ${room.slice(3)}`;
}

/** Accepts "482913", "482 913", "482-913" or "#482913"; anything else is null. */
export function parseRoom(input: string): string | null {
  const digits = input.replace(/[\s#-]/g, "");
  return /^[1-9]\d{5}$/.test(digits) ? digits : null;
}
