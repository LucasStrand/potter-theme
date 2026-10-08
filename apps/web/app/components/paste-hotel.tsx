"use client";
// Paste Hotel (/tools/paste-hotel).
// Check a paste in, get a six-digit room number, type that number on the other device.
// The paste checks out by itself when its stay is up; a room key keeps the hallway out.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlavorSwitch } from "./flavor-switch";
import { useCopy } from "../lib/use-copy";
import {
  DEFAULT_STAY,
  formatRoom,
  MAX_KEY_LENGTH,
  MAX_PASTE_BYTES,
  parseRoom,
  STAYS,
  type StayId,
} from "../lib/paste-hotel";

type Booking = { room: string; checkout: string; locked: boolean };
type Visit = { room: string; body: string; checkout: string };

const ACCENT = "var(--site-accent, var(--potter-peach))";
const encoder = new TextEncoder();

function size(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${+(bytes / 1024).toFixed(1)} KB`;
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

  // check in
  const [text, setText] = useState("");
  const [stay, setStay] = useState<StayId>(DEFAULT_STAY);
  const [key, setKey] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // visit
  const [roomInput, setRoomInput] = useState("");
  const [visitKey, setVisitKey] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const bytes = useMemo(() => encoder.encode(text).length, [text]);
  const tooBig = bytes > MAX_PASTE_BYTES;

  const checkIn = async () => {
    if (!text.trim() || tooBig || checkingIn) return;
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const { ok, status, data } = await post("/api/paste-hotel", { body: text, stay, key: key || undefined });
      if (!ok) throw new Error(String(data.error ?? `Check-in failed (${status}).`));
      setBooking({ room: String(data.room), checkout: String(data.checkout), locked: Boolean(key) });
    } catch (e) {
      setCheckInError(e instanceof Error ? e.message : "Check-in failed.");
    } finally {
      setCheckingIn(false);
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
      setVisit({ room, body: String(data.body), checkout: String(data.checkout) });
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
            Get text from one screen to another without logging into anything. Check it in, carry the room
            number to the other device, and it checks out on its own when the stay is up.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* check in */}
          <section className="rounded-2xl p-6" style={{ background: "var(--potter-mantle)", border: "1px solid var(--potter-surface0)" }}>
            <Label>check in</Label>
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
                    {booking.locked ? " · locked with a key" : ""}
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
                    setKey("");
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
                  rows={10}
                  spellCheck={false}
                  placeholder="A link, a command, an address, a wall of text…"
                  aria-label="Text to check in"
                  className="mt-3 w-full resize-y rounded-xl p-4 font-mono text-sm outline-none"
                  style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" }}
                />
                <p
                  className="mt-1 text-right font-mono text-[11px]"
                  style={{ color: tooBig ? "var(--potter-red)" : "var(--potter-overlay2)" }}
                >
                  {size(bytes)} / {size(MAX_PASTE_BYTES)}
                </p>

                <div className="mt-3">
                  <Label>length of stay</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STAYS.map((s) => (
                      <Pill key={s.id} active={stay === s.id} onClick={() => setStay(s.id)}>
                        {s.label}
                      </Pill>
                    ))}
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
                    style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" }}
                  />
                </div>

                {checkInError && (
                  <p className="mt-3 text-sm" style={{ color: "var(--potter-red)" }}>
                    {checkInError}
                  </p>
                )}
                <PrimaryButton onClick={() => void checkIn()} disabled={!text.trim() || tooBig || checkingIn}>
                  {checkingIn ? "Checking in…" : "Check in"}
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
                style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" }}
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
                  style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" }}
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm" style={{ color: "var(--potter-subtext0)" }}>
                    Room {formatRoom(visit.room)} · checks out {checkoutLabel(visit.checkout)}
                  </p>
                  <SecondaryButton onClick={() => copy(visit.body)}>{copied === visit.body ? "Copied" : "Copy text"}</SecondaryButton>
                </div>
                <pre
                  className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-sm"
                  style={{ background: "var(--potter-base)", border: "1px solid var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  {visit.body}
                </pre>
              </div>
            )}
          </section>
        </div>

        <ul className="mt-10 grid gap-6 text-sm sm:grid-cols-3" style={{ color: "var(--potter-subtext0)" }}>
          <li>
            <span style={{ color: "var(--potter-text)" }}>No guest book.</span> No account, no sign-up — the room number is
            the whole receipt.
          </li>
          <li>
            <span style={{ color: "var(--potter-text)" }}>Nobody lives here.</span> When the stay is up the room stops
            opening and gets cleared out.
          </li>
          <li>
            <span style={{ color: "var(--potter-text)" }}>Lock what matters.</span> An unlocked room opens for anyone with
            its number. Keys are stored only as a hash.
          </li>
        </ul>
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
