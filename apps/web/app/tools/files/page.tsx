import type { Metadata } from "next";
import Link from "next/link";
import { deleteFile, signOut } from "./actions";
import { SignIn } from "./sign-in";
import { db, isOwner, isToolId, storageConfigured, type ToolFileRow } from "../../lib/tool-files.server";
import { TOOL_IDS, TOOL_LABEL } from "../../lib/tool-ids";

// Reachable by URL only — not linked from anywhere, and kept out of search engines.
export const metadata: Metadata = {
  title: "Files — the Potter workshop",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  const { tool } = await searchParams;
  const filter = isToolId(tool) ? tool : null;

  let body: React.ReactNode;
  if (!storageConfigured() || !process.env.FILES_PASSWORD) {
    body = (
      <p className="mt-10 max-w-xl text-sm" style={{ color: "var(--potter-subtext0)" }}>
        File storage isn&apos;t set up yet. Link a private Vercel Blob store and a Neon Postgres database to the
        project, and set <code>FILES_PASSWORD</code>.
      </p>
    );
  } else if (!(await isOwner())) {
    body = <SignIn />;
  } else {
    const sql = await db();
    const rows = (
      filter
        ? await sql`SELECT * FROM tool_files WHERE tool = ${filter} ORDER BY created_at DESC LIMIT 500`
        : await sql`SELECT * FROM tool_files ORDER BY created_at DESC LIMIT 500`
    ) as ToolFileRow[];

    body = (
      <>
        <div className="mt-10 flex flex-wrap items-center gap-1.5">
          <FilterPill href="/tools/files" active={!filter}>All</FilterPill>
          {TOOL_IDS.map((t) => (
            <FilterPill key={t} href={`/tools/files?tool=${t}`} active={filter === t}>
              {TOOL_LABEL[t]}
            </FilterPill>
          ))}
          <form action={signOut} className="ml-auto">
            <button className="cursor-pointer text-sm transition-opacity hover:opacity-70" style={{ color: "var(--potter-subtext1)" }}>
              Sign out
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="mt-10 text-sm" style={{ color: "var(--potter-subtext0)" }}>Nothing saved yet.</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex gap-3 rounded-xl p-3"
                style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}
              >
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg font-mono text-[10px] uppercase"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-overlay2)" }}
                >
                  {r.content_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${r.id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    r.name.split(".").pop()?.slice(0, 5) ?? "file"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--potter-text)" }} title={r.name}>
                    {r.name}
                  </p>
                  <p className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
                    {TOOL_LABEL[r.tool] ?? r.tool} · {formatSize(Number(r.size))}
                  </p>
                  <p className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
                    {new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                  <div className="mt-1 flex gap-3 text-xs" style={{ color: "var(--site-accent, var(--potter-peach))" }}>
                    <a href={`/api/files/${r.id}`} target="_blank" rel="noreferrer" className="hover:opacity-70">Open</a>
                    <a href={`/api/files/${r.id}?download=1`} className="hover:opacity-70">Download</a>
                    <form action={deleteFile}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="cursor-pointer hover:opacity-70" style={{ color: "var(--potter-red)" }}>Delete</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
          <Link href="/tools" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--potter-subtext1)" }}>
            Tools
          </Link>
        </div>
        <header className="mt-12 sm:mt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            the workshop drawer
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Files
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Everything the tools have been handed, newest first.
          </p>
        </header>
        {body}
      </div>
    </main>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--site-accent, var(--potter-peach))" : "var(--potter-surface0)",
        color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
      }}
    >
      {children}
    </Link>
  );
}
