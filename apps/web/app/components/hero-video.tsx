"use client";
import { useEffect, useRef, useState } from "react";
import { useFlavor } from "../flavor-provider";

/**
 * Ambient ink footage behind the hero — sepia ink blooming on cream,
 * generated to match the palette. Parchment shows it as shot; Quill/Ink
 * get the photographic negative (invert + hue-rotate keeps the ink warm),
 * so one clip serves all three flavors. It fades in only once it can
 * play and is skipped entirely for prefers-reduced-motion (the vignette
 * remains).
 */
export function HeroVideo() {
  const { flavor } = useFlavor();
  const dark = flavor !== "parchment";
  const src = "/hero/ink.mp4";

  const [motionOk, setMotionOk] = useState(false);
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotionOk(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // A hair slower than shot speed reads as calmer without stutter. Also
  // nudge playback back to life — Chrome defers autoplay in hidden tabs
  // and won't resume on its own.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = 0.85;
    const kick = () => {
      if (v.paused) v.play().catch(() => {});
    };
    kick();
    document.addEventListener("visibilitychange", kick);
    return () => document.removeEventListener("visibilitychange", kick);
  }, [motionOk, src]);

  if (!motionOk) return null;

  return (
    <video
      key={src}
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out"
      style={{
        opacity: ready ? (dark ? 0.55 : 0.6) : 0,
        filter: dark
          ? "invert(1) hue-rotate(180deg) saturate(0.8) brightness(0.85)"
          : "saturate(0.9)",
      }}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
    />
  );
}
