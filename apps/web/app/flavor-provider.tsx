"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Flavor = "parchment" | "quill" | "ink";
export const FLAVORS: Flavor[] = ["parchment", "quill", "ink"];
export const FLAVOR_LABEL: Record<Flavor, string> = {
  parchment: "Parchment",
  quill: "Quill",
  ink: "Ink",
};

type Ctx = {
  flavor: Flavor;
  setFlavor: (f: Flavor) => void;
  accent: string;
  setAccent: (name: string) => void;
};

const FlavorContext = createContext<Ctx | null>(null);

export function FlavorProvider({ children }: { children: React.ReactNode }) {
  const [flavor, setFlavorState] = useState<Flavor>("quill");
  const [accent, setAccentState] = useState<string>("peach");

  // sync from what the no-flash script already applied
  useEffect(() => {
    const el = document.documentElement;
    const f = (el.getAttribute("data-potter-flavor") as Flavor) || "quill";
    setFlavorState(f);
    const a = localStorage.getItem("potter-accent");
    if (a) setAccentState(a);
  }, []);

  const apply = useCallback((f: Flavor) => {
    document.documentElement.setAttribute("data-potter-flavor", f);
    try {
      localStorage.setItem("potter-flavor", f);
    } catch {}
    setFlavorState(f);
  }, []);

  const setFlavor = useCallback(
    (f: Flavor) => {
      if (f === flavor) return;
      const start = (document as Document & { startViewTransition?: (cb: () => void) => void }).startViewTransition;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (start && !reduce) {
        start.call(document, () => apply(f));
      } else {
        apply(f);
      }
    },
    [flavor, apply],
  );

  const setAccent = useCallback((name: string) => {
    const el = document.documentElement;
    el.style.setProperty("--site-accent", `var(--potter-${name})`);
    el.style.setProperty("--site-accent-rgb", `var(--potter-${name}-rgb)`);
    try {
      localStorage.setItem("potter-accent", name);
    } catch {}
    setAccentState(name);
  }, []);

  return (
    <FlavorContext.Provider value={{ flavor, setFlavor, accent, setAccent }}>{children}</FlavorContext.Provider>
  );
}

export function useFlavor() {
  const ctx = useContext(FlavorContext);
  if (!ctx) throw new Error("useFlavor must be used within FlavorProvider");
  return ctx;
}
