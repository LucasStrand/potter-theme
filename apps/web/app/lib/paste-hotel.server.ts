// Server side of Paste Hotel: the rooms table, room numbers, room keys, the doorman who
// stops anyone walking the hallway trying every door, and the copy Potter keeps.
//
// Rooms live in Neon Postgres (DATABASE_URL); uploads live in the private Blob store
// (BLOB_READ_WRITE_TOKEN) under ROOM_FILE_PREFIX. A room is unreadable the moment its
// checkout passes (every read filters on it); expired rooms are swept out on each check-in,
// and their uploads with them — unless the guest left "keep a copy" on, in which case the
// text and files were also filed under Paste Hotel in Potter's file storage at check-in.
// Room keys are scrypt-hashed; the key itself is never stored.

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { del, head, issueSignedToken, presignUrl, put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { ROOM_FILE_PREFIX, VISIT_GRACE_SECONDS } from "./paste-hotel";
import { db as filesDb, storageConfigured } from "./tool-files.server";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export function hotelConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** One upload as a room holds it. */
export type RoomFile = { name: string; pathname: string; url: string; size: number; contentType: string };

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
    // Columns added after the first release.
    .then(() => q`ALTER TABLE paste_hotel_rooms ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]'::jsonb`)
    .then(() => q`ALTER TABLE paste_hotel_rooms ADD COLUMN IF NOT EXISTS burn BOOLEAN NOT NULL DEFAULT false`)
    .then(() => q`ALTER TABLE paste_hotel_rooms ADD COLUMN IF NOT EXISTS keep BOOLEAN NOT NULL DEFAULT false`)
    .then(() => q`ALTER TABLE paste_hotel_rooms ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ`)
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

// --- luggage -----------------------------------------------------------------------------

/** Looks each upload up in our own store rather than trusting the client's word for it. */
export async function resolveUploads(uploads: { url: string; name: string }[]): Promise<RoomFile[] | null> {
  try {
    const files = await Promise.all(
      uploads.map(async ({ url, name }) => {
        const blob = await head(url);
        if (!blob.pathname.startsWith(ROOM_FILE_PREFIX)) throw new Error("Not a Paste Hotel upload");
        return {
          name: name.slice(0, 255) || blob.pathname.split("/").pop() || "file",
          pathname: blob.pathname,
          url: blob.url,
          size: blob.size,
          contentType: blob.contentType,
        };
      }),
    );
    return files;
  } catch {
    return null;
  }
}

/** Throws away uploads for a check-in that didn't happen. Only touches Paste Hotel's own folder. */
export async function discardUploads(urls: string[]) {
  const ours = urls.filter((u) => {
    try {
      return new URL(u).pathname.slice(1).startsWith(ROOM_FILE_PREFIX);
    } catch {
      return false;
    }
  });
  if (ours.length) await del(ours).catch((e) => console.warn("[paste-hotel] couldn't discard uploads", e));
}

/** Short-lived, per-file download links straight from Blob — no function in the download path. */
async function signDownloads(files: RoomFile[], until: number) {
  return Promise.all(
    files.map(async (f) => {
      const token = await issueSignedToken({ pathname: f.pathname, operations: ["get"], validUntil: until });
      const { presignedUrl } = await presignUrl(token, { operation: "get", pathname: f.pathname, access: "private", validUntil: until });
      return { name: f.name, size: f.size, contentType: f.contentType, url: presignedUrl };
    }),
  );
}

/** Potter keeps what it's given: the text as a .txt plus every upload, filed under Paste Hotel. */
async function keepCopy(room: string, body: string, files: RoomFile[]) {
  if (!storageConfigured()) return;
  try {
    const kept = [...files];
    if (body) {
      const contentType = "text/plain; charset=utf-8";
      const blob = await put(`paste-hotel/text/room-${room}.txt`, body, { access: "private", addRandomSuffix: true, contentType });
      kept.unshift({ name: `room-${room}.txt`, pathname: blob.pathname, url: blob.url, size: Buffer.byteLength(body), contentType });
    }
    const sql = await filesDb();
    for (const f of kept) {
      await sql`
        INSERT INTO tool_files (tool, name, pathname, url, content_type, size)
        VALUES ('paste-hotel', ${f.name}, ${f.pathname}, ${f.url}, ${f.contentType}, ${f.size})
        ON CONFLICT (pathname) DO NOTHING`;
    }
  } catch (e) {
    console.warn(`[paste-hotel] couldn't keep a copy of room ${room}`, e);
  }
}

/** Clears out rooms whose stay is up. Their uploads go too, unless a copy was kept. */
async function sweep(sql: Awaited<ReturnType<typeof db>>) {
  const gone = (await sql`DELETE FROM paste_hotel_rooms WHERE checkout < now() RETURNING files, keep`) as {
    files: RoomFile[];
    keep: boolean;
  }[];
  const loose = gone.filter((r) => !r.keep).flatMap((r) => r.files.map((f) => f.url));
  if (loose.length) await del(loose).catch((e) => console.warn("[paste-hotel] couldn't clear out uploads", e));
}

// --- check in / open ---------------------------------------------------------------------

const iso = (v: unknown) => new Date(v as string | Date).toISOString();

/** Puts the paste in a free room (100 000–999 999) and returns its number and checkout time. */
export async function checkIn(input: {
  body: string;
  files: RoomFile[];
  staySeconds: number;
  key: string | null;
  burn: boolean;
  keep: boolean;
}) {
  const sql = await db();
  await sweep(sql);
  const keyHash = input.key ? await hashKey(input.key) : null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = String(randomInt(100_000, 1_000_000));
    const rows = (await sql`
      INSERT INTO paste_hotel_rooms (room, body, key_hash, checkout, files, burn, keep)
      VALUES (${room}, ${input.body}, ${keyHash}, now() + ${input.staySeconds}::int * interval '1 second',
              ${JSON.stringify(input.files)}::jsonb, ${input.burn}, ${input.keep})
      ON CONFLICT (room) DO NOTHING
      RETURNING room, checkout`) as { room: string; checkout: unknown }[];
    if (rows.length) {
      if (input.keep) await keepCopy(room, input.body, input.files);
      return { room: rows[0].room, checkout: iso(rows[0].checkout) };
    }
  }
  throw new Error("No free room found");
}

export type OpenedFile = { name: string; size: number; contentType: string; url: string };

export type OpenResult =
  | { status: "ok"; body: string; checkout: string; locked: boolean; burn: boolean; files: OpenedFile[] }
  | { status: "vacant" }
  | { status: "locked" }
  | { status: "wrong-key" };

export async function openRoom(room: string, key: string | null): Promise<OpenResult> {
  const sql = await db();
  const [row] = (await sql`
    SELECT body, key_hash, checkout, files, burn FROM paste_hotel_rooms
    WHERE room = ${room} AND checkout > now() AND visited_at IS NULL`) as {
    body: string;
    key_hash: string | null;
    checkout: unknown;
    files: RoomFile[];
    burn: boolean;
  }[];
  if (!row) return { status: "vacant" };
  if (row.key_hash) {
    if (!key) return { status: "locked" };
    if (!(await keyFits(key, row.key_hash))) return { status: "wrong-key" };
  }

  let checkout = row.checkout;
  if (row.burn) {
    // First visit wins: claim the room in one statement so two visitors can't both get in.
    // It stops opening for anyone else, but stays around for the download grace period.
    const [claimed] = (await sql`
      UPDATE paste_hotel_rooms
      SET visited_at = now(), checkout = LEAST(checkout, now() + ${VISIT_GRACE_SECONDS}::int * interval '1 second')
      WHERE room = ${room} AND visited_at IS NULL AND checkout > now()
      RETURNING checkout`) as { checkout: unknown }[];
    if (!claimed) return { status: "vacant" };
    checkout = claimed.checkout;
  }

  // Links last the grace period or until checkout, whichever is first — but never less than a minute.
  const now = Date.now();
  const until = Math.max(Math.min(now + VISIT_GRACE_SECONDS * 1000, new Date(checkout as string).getTime()), now + 60_000);
  const files = row.files.length && blobConfigured() ? await signDownloads(row.files, until) : [];
  return { status: "ok", body: row.body, checkout: iso(checkout), locked: Boolean(row.key_hash), burn: row.burn, files };
}
