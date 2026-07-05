"use client";
import { useEffect, useRef } from "react";

/**
 * The reading line — a hairline of ink in the live accent that draws itself
 * across the top of the viewport as you scroll, like a quill keeping your
 * place in the manuscript.
 */
export function ScrollInk() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left"
      style={{
        transform: "scaleX(0)",
        background:
          "linear-gradient(to right, var(--site-accent, var(--potter-peach)), rgb(var(--site-accent-rgb, var(--potter-peach-rgb)) / 0.55))",
      }}
    />
  );
}
