"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export function SignIn() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-10 flex max-w-sm flex-col gap-3">
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        className="rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{ background: "var(--potter-surface0)", color: "var(--potter-text)", border: "1px solid var(--potter-surface1)" }}
      />
      <button
        disabled={pending}
        className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
      >
        {pending ? "Checking…" : "Open the drawer"}
      </button>
      {error && <p className="text-sm" style={{ color: "var(--potter-red)" }}>{error}</p>}
    </form>
  );
}
