"use client";
import { InkCanvas } from "./ink-canvas";
import { Wordmark } from "./wordmark";
import { FlavorSwitch } from "./flavor-switch";
import { ACCENTS } from "../lib/palette";
import { useFlavor } from "../flavor-provider";

export function Hero() {
  const { accent, setAccent } = useFlavor();
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <InkCanvas />
      {/* legibility + vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 30%, transparent 40%, rgb(var(--potter-base-rgb) / 0.55) 100%), linear-gradient(to bottom, transparent 55%, var(--potter-base) 98%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <p className="rise font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: "var(--potter-subtext0)" }}>
          ~ a quill writes ~
        </p>
        <div className="mt-6">
          <Wordmark />
        </div>
        <p
          className="rise rise-1 mx-auto mt-8 max-w-[46ch] text-balance text-lg sm:text-xl"
          style={{ color: "var(--potter-subtext0)" }}
        >
          A warm <strong style={{ color: "var(--potter-text)" }}>paper &amp; ink</strong> color theme.
          Three flavors, for your editor, your terminal, your whole desktop.
        </p>
        <div className="rise rise-2 mt-10">
          <FlavorSwitch />
        </div>

        {/* accent picker */}
        <div className="rise rise-3 mt-8 flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--potter-overlay2)" }}>
            accent
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a}
                onClick={() => setAccent(a)}
                title={a}
                aria-label={`Use ${a} as accent`}
                className="h-5 w-5 cursor-pointer rounded-full transition-transform hover:scale-125"
                style={{
                  background: `var(--potter-${a})`,
                  outline: accent === a ? "2px solid var(--potter-text)" : "1px solid rgb(var(--potter-overlay0-rgb) / 0.4)",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "var(--potter-overlay2)" }}
      >
        scroll ↓
      </div>
    </section>
  );
}
