// Server side of "every tool keeps what it was given": the files table, the blob access
// mode, and the owner-only password check used by /tools/files.
//
// Storage is two Vercel integrations:
//   - a *private* Vercel Blob store holds the bytes (BLOB_READ_WRITE_TOKEN, injected when the store is linked).
//   - Neon Postgres holds one row per file (DATABASE_URL, injected by the Neon integration).
// FILES_PASSWORD gates the /tools/files browser. Missing env vars turn saving into a no-op
// rather than breaking the tools.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { TOOL_IDS, type ToolId } from "./tool-ids";

/** Largest single file a tool may store (3D scenes get big). */
export const MAX_FILE_BYTES = 250 * 1024 * 1024;

export function storageConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.BLOB_READ_WRITE_TOKEN);
}

export function isToolId(v: unknown): v is ToolId {
  return typeof v === "string" && (TOOL_IDS as readonly string[]).includes(v);
}

export type ToolFileRow = {
  id: number;
  tool: ToolId;
  name: string;
  pathname: string;
  url: string;
  content_type: string;
  size: number;
  created_at: string;
};

let schemaReady: Promise<unknown> | null = null;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

/** Lazily creates the table the first time an instance touches it — no migration step to forget. */
export async function db() {
  const q = sql();
  schemaReady ??= q`
    CREATE TABLE IF NOT EXISTS tool_files (
      id           BIGSERIAL PRIMARY KEY,
      tool         TEXT NOT NULL,
      name         TEXT NOT NULL,
      pathname     TEXT NOT NULL UNIQUE,
      url          TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size         BIGINT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )`.then(() => q`CREATE INDEX IF NOT EXISTS tool_files_tool_created ON tool_files (tool, created_at DESC)`)
    .catch((e) => {
      schemaReady = null;
      throw e;
    });
  await schemaReady;
  return q;
}

// --- owner auth for /tools/files -------------------------------------------------------

export const AUTH_COOKIE = "potter-files";

function sessionToken(password: string): string {
  return createHmac("sha256", password).update("potter-files/v1").digest("hex");
}

export function passwordMatches(candidate: string): boolean {
  const password = process.env.FILES_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(sessionToken(candidate));
  const b = Buffer.from(sessionToken(password));
  return timingSafeEqual(a, b);
}

export function sessionCookieValue(): string | null {
  const password = process.env.FILES_PASSWORD;
  return password ? sessionToken(password) : null;
}

export async function isOwner(): Promise<boolean> {
  const expected = sessionCookieValue();
  if (!expected) return false;
  const got = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
