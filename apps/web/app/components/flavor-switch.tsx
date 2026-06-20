"use client";
import { FLAVORS, FLAVOR_LABEL, useFlavor, type Flavor } from "../flavor-provider";

const ICON: Record<Flavor, string> = { parchment: "🪶", quill: "🖋️", ink: "🌑" };

export function FlavorSwitch({ size = "md" }: { size?: "sm" | "md" }) {
  const { flavor, setFlavor } = useFlavor();
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <div
      role="tablist"
      aria-label="Theme flavor"
      className="inline-flex gap-1 rounded-full p-1"
      style={{ background: "var(--potter-surface0)", border: "1px solid var(--potter-surface1)" }}
    >
      {FLAVORS.map((f) => {
        const active = f === flavor;
        return (
          <button
            key={f}
            role="tab"
            aria-selected={active}
            onClick={() => setFlavor(f)}
            className={`${pad} cursor-pointer rounded-full font-medium transition-colors`}
            style={{
              background: active ? "var(--site-accent, var(--potter-peach))" : "transparent",
              color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
            }}
          >
            <span aria-hidden className="mr-1.5">{ICON[f]}</span>
            {FLAVOR_LABEL[f]}
          </button>
        );
      })}
    </div>
  );
}
