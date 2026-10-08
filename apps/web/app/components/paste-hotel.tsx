"use client";
// Paste Hotel (/tools/paste-hotel).
// Check text or files in, get a six-digit room number, type that number on the other device.
// The room checks out by itself when its stay is up (or right after its first visit, if asked);
// a room key keeps the hallway out. Like every Potter tool it keeps a copy of what it's given
// in Potter's file storage — the gear on the check-in card switches that off.

import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlavorSwitch } from "./flavor-switch";
import { useCopy } from "../lib/use-copy";
import {
  DEFAULT_STAY,
  formatRoom,
  MAX_KEY_LENGTH,
  MAX_PASTE_BYTES,
  MAX_ROOM_FILE_BYTES,
  MAX_ROOM_FILES,
  parseRoom,
  ROOM_FILE_PREFIX,
  STAYS,
  type StayId,
} from "../lib/paste-hotel";

type Booking = { room: string; checkout: string; locked: boolean; burn: boolean; keep: boolean; files: number };
type VisitFile = { name: string; size: number; url: string };
type Visit = { room: string; body: string; checkout: string; burn: boolean; files: VisitFile[] };

const ACCENT = "var(--site-accent, var(--potter-peach))";
const KEEP_PREF = "potter-paste-hotel-keep";
const encoder = new TextEncoder();

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${+(bytes / 1024).toFixed(1)} KB`;
  return `${+(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "Thu 9 Oct, 18:20 (in 1 day)" */
function checkoutLabel(iso: string): string {
  const at = new Date(iso);
  const min = Math.max(1, Math.round((at.getTime() - Date.now()) / 60_000));
  const until = min < 60 ? `${min} min` : min < 48 * 60 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} days`;
  const when = at.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${when} (in ${until})`;
}

async function post(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function PasteHotel() {
  const { copied, copy } = useCopy();

  // settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keep, setKeep] = useState(true);

  // check in
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [stay, setStay] = useState<StayId>(DEFAULT_STAY);
  const [burn, setBurn] = useState(false);
  const [key, setKey] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // visit
  const [roomInput, setRoomInput] = useState("");
  const [visitKey, setVisitKey] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const bytes = useMemo(() => encoder.encode(text).length, [text]);
  const fileBytes = files.reduce((n, f) => n + f.size, 0);
  const tooBig = bytes > MAX_PASTE_BYTES;
  const tooManyFiles = files.length > MAX_ROOM_FILES;
  const filesTooBig = fileBytes > MAX_ROOM_FILE_BYTES;
  const canCheckIn = Boolean(text.trim() || files.length) && !tooBig && !tooManyFiles && !filesTooBig && !checkingIn;

  // The keep-a-copy choice is remembered per browser.
  useEffect(() => {
    try {
      if (localStorage.getItem(KEEP_PREF) === "0") setKeep(false);
    } catch {}
  }, []);
  const changeKeep = (value: boolean) => {
    setKeep(value);
    try {
      localStorage.setItem(KEEP_PREF, value ? "1" : "0");
    } catch {}
  };

  // Copy out of the FileList now: it's live, and clearing the input empties it before React
  // gets round to running the state update.
  const addFiles = (list: FileList | null) => {
    const picked = list ? Array.from(list) : [];
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  };

  const checkIn = async () => {
    if (!canCheckIn) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      // Files go straight from the browser to storage; the check-in only carries their receipts.
      const folder = crypto.randomUUID();
      const uploads: { url: string; name: string }[] = [];
      for (const [i, f] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const safeName = f.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
        const blob = await upload(`${ROOM_FILE_PREFIX}${folder}/${i}/${safeName}`, f, {
          access: "private",
          handleUploadUrl: "/api/files/upload",
          clientPayload: JSON.stringify({ tool: "paste-hotel" }),
          contentType: f.type || "application/octet-stream",
          multipart: f.size > 8 * 1024 * 1024,
        }).catch((e: unknown) => {
          throw new Error(`Couldn't upload ${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
        });
        uploads.push({ url: blob.url, name: f.name });
      }
      setProgress(null);
      const { ok, status, data } = await post("/api/paste-hotel", {
        body: text,
        files: uploads,
        stay,
        key: key || undefined,
        burn,
        keep,
      });
      if (!ok) throw new Error(String(data.error ?? `Check-in failed (${status}).`));
      setBooking({ room: String(data.room), checkout: String(data.checkout), locked: Boolean(key), burn, keep, files: files.length });
    } catch (e) {
      setCheckInError(e instanceof Error ? e.message : "Check-in failed.");
    } finally {
      setCheckingIn(false);
      setProgress(null);
    }
  };

  const open = useCallback(async (roomText: string, roomKey: string) => {
    const room = parseRoom(roomText);
    if (!room) {
      setOpenError("Room numbers are six digits.");
      return;
    }
    setOpening(true);
    setOpenError(null);
    setVisit(null);
    try {
      const { ok, status, data } = await post("/api/paste-hotel/open", { room, key: roomKey || undefined });
      if (data.locked) setNeedsKey(true);
      if (!ok) throw new Error(String(data.error ?? `Couldn't open the room (${status}).`));
      setVisit({
        room,
        body: String(data.body ?? ""),
        checkout: String(data.checkout),
        burn: Boolean(data.burn),
        files: Array.isArray(data.files) ? (data.files as VisitFile[]) : [],
      });
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Couldn't open the room.");
    } finally {
      setOpening(false);
    }
  }, []);

  // A shared link (?room=482913) walks straight to the door.
  useEffect(() => {
    const room = parseRoom(new URLSearchParams(window.location.search).get("room") ?? "");
    if (!room) return;
    setRoomInput(formatRoom(room));
    void open(room, "");
  }, [open]);

  const link = booking ? `${window.location.origin}/tools/paste-hotel?room=${booking.room}` : "";
  const fieldStyle = { background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: ACCENT }}>.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--potter-subtext1)" }}>
            <Link href="/tools" className="transition-opacity hover:opacity-70">Tools</Link>
            <FlavorSwitch size="sm" />
          </div>
        </div>

        <header className="mt-10 sm:mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            check in · check out
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Paste Hotel
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Get text and files from one screen to another without logging into anything. Check them in, carry the
            room number to the other device, and they check out on their own when the stay is up.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* check in */}
          <section className="rounded-2xl p-6" style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}>
            <div className="flex items-center justify-between">
              <Label>check in</Label>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                aria-label="Paste Hotel settings"
                aria-expanded={settingsOpen}
                title="Settings"
                className="-my-1 cursor-pointer rounded-md p-1.5 transition-opacity hover:opacity-70"
                style={{ color: settingsOpen ? ACCENT : "var(--potter-overlay2)" }}
              >
                <GearIcon />
              </button>
            </div>

            {settingsOpen && (
              <div className="mt-3 flex items-start justify-between gap-4 rounded-xl p-4" style={fieldStyle}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--potter-text)" }}>Keep a copy</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--potter-subtext0)" }}>
                    {keep
                      ? "Potter keeps what's checked in here — text and files — in its file storage, even after checkout."
                      : "Nothing outlives the stay: at checkout the room and its files are cleared out."}
                  </p>
                </div>
                <Switch checked={keep} onChange={changeKeep} label="Keep a copy" />
              </div>
            )}

            {booking ? (
              <>
                <div
                  className="mt-3 flex flex-col items-center rounded-xl px-6 py-10 text-center"
                  style={{ background: "var(--potter-base)", border: "1px dashed var(--potter-surface1)" }}
                >
                  <Label>your room</Label>
                  <p className="font-display mt-2 text-6xl font-semibold tabular-nums sm:text-7xl" style={{ color: ACCENT }}>
                    {formatRoom(booking.room)}
                  </p>
                  <p className="mt-4 text-sm" style={{ color: "var(--potter-subtext0)" }}>
                    Checks out {checkoutLabel(booking.checkout)}
                    {booking.burn ? ", or right after the first visit" : ""}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--potter-overlay2)" }}>
                    {[
                      booking.locked && "locked with a key",
                      booking.files > 0 && `${booking.files} file${booking.files === 1 ? "" : "s"}`,
                      booking.keep ? "a copy is kept" : "no copy kept",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={() => copy(booking.room)}>
                    {copied === booking.room ? "Copied" : "Copy room number"}
                  </SecondaryButton>
                  <SecondaryButton onClick={() => copy(link)}>{copied === link ? "Copied" : "Copy link"}</SecondaryButton>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBooking(null);
                    setText("");
                    setFiles([]);
                    setKey("");
                    setBurn(false);
                  }}
                  className="mt-4 w-full cursor-pointer text-sm underline-offset-4 hover:underline"
                  style={{ color: "var(--potter-subtext1)" }}
                >
                  Check in something else
                </button>
              </>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void checkIn();
                  }}
                  rows={8}
                  spellCheck={false}
                  placeholder="A link, a command, an address, a wall of text…"
                  aria-label="Text to check in"
                  className="mt-3 w-full resize-y rounded-xl p-4 font-mono text-sm outline-none"
                  style={fieldStyle}
                />
                <p
                  className="mt-1 text-right font-mono text-[11px]"
                  style={{ color: tooBig ? "var(--potter-red)" : "var(--potter-overlay2)" }}
                >
                  {size(bytes)} / {size(MAX_PASTE_BYTES)}
                </p>

                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className="mt-2 flex cursor-pointer flex-wrap items-center justify-center gap-x-1.5 rounded-lg px-3 py-3 text-center text-sm"
                  style={{
                    border: `1px dashed ${dragging ? ACCENT : "var(--potter-surface1)"}`,
                    color: "var(--potter-subtext1)",
                  }}
                >
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  Drop files here or <span style={{ color: ACCENT }}>browse</span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
                    · up to {MAX_ROOM_FILES}, {size(MAX_ROOM_FILE_BYTES)} in all
                  </span>
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate" style={{ color: "var(--potter-text)" }}>{f.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>{size(f.size)}</span>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                            aria-label={`Remove ${f.name}`}
                            className="cursor-pointer px-1 transition-opacity hover:opacity-70"
                            style={{ color: "var(--potter-overlay2)" }}
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {(tooManyFiles || filesTooBig) && (
                  <p className="mt-1 text-sm" style={{ color: "var(--potter-red)" }}>
                    {tooManyFiles
                      ? `A room holds up to ${MAX_ROOM_FILES} files.`
                      : `That's ${size(fileBytes)} — a room's files can add up to ${size(MAX_ROOM_FILE_BYTES)}.`}
                  </p>
                )}

                <div className="mt-4">
                  <Label>length of stay</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STAYS.map((s) => (
                      <Pill key={s.id} active={stay === s.id} onClick={() => setStay(s.id)}>
                        {s.label}
                      </Pill>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Pill active={burn} onClick={() => setBurn((b) => !b)}>
                      {burn ? "✓ " : ""}Check out after the first visit
                    </Pill>
                  </div>
                </div>

                <div className="mt-5">
                  <Label>room key · optional</Label>
                  <input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    maxLength={MAX_KEY_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Leave empty for an unlocked room"
                    aria-label="Room key"
                    className="mt-2 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={fieldStyle}
                  />
                </div>

                {checkInError && (
                  <p className="mt-3 text-sm" style={{ color: "var(--potter-red)" }}>
                    {checkInError}
                  </p>
                )}
                <PrimaryButton onClick={() => void checkIn()} disabled={!canCheckIn}>
                  {progress ?? (checkingIn ? "Checking in…" : "Check in")}
                </PrimaryButton>
              </>
            )}
          </section>

          {/* visit */}
          <section className="rounded-2xl p-6" style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}>
            <Label>visit a room</Label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void open(roomInput, visitKey);
              }}
              className="mt-3"
            >
              <input
                value={roomInput}
                onChange={(e) => {
                  setRoomInput(e.target.value);
                  setNeedsKey(false);
                  setVisitKey("");
                }}
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                placeholder="482 913"
                aria-label="Room number"
                className="font-display w-full rounded-xl px-4 py-3 text-3xl tabular-nums tracking-wide outline-none placeholder:text-[color:var(--potter-surface2)]"
                style={fieldStyle}
              />
              {needsKey && (
                <input
                  value={visitKey}
                  onChange={(e) => setVisitKey(e.target.value)}
                  maxLength={MAX_KEY_LENGTH}
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  placeholder="Room key"
                  aria-label="Room key"
                  className="mt-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={fieldStyle}
                />
              )}
              {openError && (
                <p className="mt-3 text-sm" style={{ color: "var(--potter-red)" }}>
                  {openError}
                </p>
              )}
              <PrimaryButton type="submit" disabled={opening || !roomInput.trim()}>
                {opening ? "Opening…" : "Open"}
              </PrimaryButton>
            </form>

            {visit && (
              <div className="mt-6">
                <p className="text-sm" style={{ color: "var(--potter-subtext0)" }}>
                  Room {formatRoom(visit.room)} ·{" "}
                  {visit.burn
                    ? `checked out on your visit — downloads stay open until ${checkoutLabel(visit.checkout)}`
                    : `checks out ${checkoutLabel(visit.checkout)}`}
                </p>
                {visit.body && (
                  <>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Label>text</Label>
                      <SecondaryButton onClick={() => copy(visit.body)}>{copied === visit.body ? "Copied" : "Copy text"}</SecondaryButton>
                    </div>
                    <pre
                      className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-sm"
                      style={fieldStyle}
                    >
                      {visit.body}
                    </pre>
                  </>
                )}
                {visit.files.length > 0 && (
                  <>
                    <div className="mt-4">
                      <Label>files</Label>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {visit.files.map((f) => (
                        <li key={f.url} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={fieldStyle}>
                          <span className="min-w-0 truncate text-sm">{f.name}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>{size(f.size)}</span>
                            <a
                              href={f.url}
                              download={f.name}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                              style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                            >
                              Download
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--potter-overlay2)" }}>
      {children}
    </p>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? ACCENT : "var(--potter-surface0)",
        color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
      }}
    >
      {children}
    </button>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ background: checked ? ACCENT : "var(--potter-surface1)" }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform"
        style={{ background: "var(--potter-base)", transform: checked ? "translateX(20px)" : "none" }}
      />
    </button>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="mt-5 w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
      style={{ background: ACCENT, color: "var(--potter-base)" }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
    >
      {children}
    </button>
  );
}
