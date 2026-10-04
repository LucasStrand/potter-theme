"use server";

import { del } from "@vercel/blob";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE, db, isOwner, passwordMatches, sessionCookieValue, type ToolFileRow } from "../../lib/tool-files.server";

export async function signIn(_prev: string | null, form: FormData): Promise<string | null> {
  const password = String(form.get("password") ?? "");
  const value = sessionCookieValue();
  if (!value || !passwordMatches(password)) return "That's not it.";
  (await cookies()).set(AUTH_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/tools/files");
  return null;
}

export async function signOut() {
  (await cookies()).delete(AUTH_COOKIE);
  revalidatePath("/tools/files");
}

export async function deleteFile(form: FormData) {
  if (!(await isOwner())) return;
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id)) return;
  const sql = await db();
  const [row] = (await sql`DELETE FROM tool_files WHERE id = ${id} RETURNING url`) as Pick<ToolFileRow, "url">[];
  if (row) await del(row.url);
  revalidatePath("/tools/files");
}
