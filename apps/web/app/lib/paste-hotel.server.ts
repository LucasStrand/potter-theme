// Server side of Paste Hotel: the rooms table, room numbers, room keys, and the doorman who
// stops anyone walking the hallway trying every door.
//
// Rooms live in Neon Postgres (DATABASE_URL). A room is unreadable the moment its checkout
// passes (every read filters on it) and expired rows are swept out on each check-in.
// Room keys are scrypt-hashed; the key itself is never stored.

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export function hotelConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let schemaReady: Promise<unknown> | null = null;

/** Lazily creates the tables the first time an instance touches them — no migration step to forget. */
async function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const q = neon(url);
  schemaReady ??= q`
    CREATE TABLE IF NOT EXISTS paste_hotel_rooms (
      room       TEXT PRIMARY KEY,
      body       TEXT NOT NULL,
      key_hash   TEXT,
      checked_in TIMESTAMPTZ NOT NULL DEFAULT now(),
      checkout   TIMESTAMPTZ NOT NULL
    )`
    .then(() => q`CREATE INDEX IF NOT EXISTS paste_hotel_rooms_checkout ON paste_hotel_rooms (checkout)`)
    .then(() => q`
      CREATE TABLE IF NOT EXISTS paste_hotel_knocks (
        who  TEXT NOT NULL,
        kind TEXT NOT NULL,
        at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`)
    .then(() => q`CREATE INDEX IF NOT EXISTS paste_hotel_knocks_who ON paste_hotel_knocks (who, kind, at)`)
    .catch((e) => {
      schemaReady = null;
      throw e;
    });
  await schemaReady;
  return q;
}

// --- the doorman -------------------------------------------------------------------------

/** One-way tag for the caller's IP, so knocks can be counted without keeping addresses. */
function visitor(request: Request): string {
  const ip =
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`paste-hotel/v1:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Records a knock and says whether the caller is still under `limit` knocks of this kind
 * in the last `windowSeconds`. Knocks older than an hour are swept in the same statement.
 */
export async function admit(request: Request, kind: "check-in" | "open", limit: number, windowSeconds: number) {
  const sql = await db();
  const who = visitor(request);
  // Data-modifying CTEs don't show up in the outer SELECT, so the count is the knocks before this one.
  const [row] = (await sql`
    WITH swept AS (DELETE FROM paste_hotel_knocks WHERE at < now() - interval '1 hour'),
         knock AS (INSERT INTO paste_hotel_knocks (who, kind) VALUES (${who}, ${kind}))
    SELECT count(*)::int AS n FROM paste_hotel_knocks
    WHERE who = ${who} AND kind = ${kind} AND at > now() - ${windowSeconds}::int * interval '1 second'`) as { n: number }[];
  return row.n < limit;
}

// --- room keys ---------------------------------------------------------------------------

async function hashKey(key: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(key, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function keyFits(key: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const got = await scryptAsync(key, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(got, expected);
}

// --- check in / open ---------------------------------------------------------------------

const iso = (v: unknown) => new Date(v as string | Date).toISOString();

/** Puts the paste in a free room (100 000–999 999) and returns its number and checkout time. */
export async function checkIn(body: string, staySeconds: number, key: string | null) {
  const sql = await db();
  await sql`DELETE FROM paste_hotel_rooms WHERE checkout < now()`;
  const keyHash = key ? await hashKey(key) : null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = String(randomInt(100_000, 1_000_000));
    const rows = (await sql`
      INSERT INTO paste_hotel_rooms (room, body, key_hash, checkout)
      VALUES (${room}, ${body}, ${keyHash}, now() + ${staySeconds}::int * interval '1 second')
      ON CONFLICT (room) DO NOTHING
      RETURNING room, checkout`) as { room: string; checkout: unknown }[];
    if (rows.length) return { room: rows[0].room, checkout: iso(rows[0].checkout) };
  }
  throw new Error("No free room found");
}

export type OpenResult =
  | { status: "ok"; body: string; checkout: string; locked: boolean }
  | { status: "vacant" }
  | { status: "locked" }
  | { status: "wrong-key" };

export async function openRoom(room: string, key: string | null): Promise<OpenResult> {
  const sql = await db();
  const [row] = (await sql`
    SELECT body, key_hash, checkout FROM paste_hotel_rooms
    WHERE room = ${room} AND checkout > now()`) as { body: string; key_hash: string | null; checkout: unknown }[];
  if (!row) return { status: "vacant" };
  if (row.key_hash) {
    if (!key) return { status: "locked" };
    if (!(await keyFits(key, row.key_hash))) return { status: "wrong-key" };
  }
  return { status: "ok", body: row.body, checkout: iso(row.checkout), locked: Boolean(row.key_hash) };
}
