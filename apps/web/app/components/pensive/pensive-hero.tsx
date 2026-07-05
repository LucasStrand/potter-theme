"use client";
// Pensive download hero — the inkwell canvas + product headline, download CTAs
// and a copy-able install line. Faithful to the Pensive Download Claude Design.
// `embedded` renders it as a band on the Potter homepage (CTAs route to the full
// /tools/pensive page, no in-hero nav); otherwise it's the standalone page hero.

import Link from "next/link";
import { useFlavor } from "../../flavor-provider";
import { useCopy } from "../../lib/use-copy";
import { PensiveCanvas, type PensivePalette } from "./pensive-canvas";

const INSTALL = "brew install pensive";

const PensiveMark = ({ size = 24, glow = true }: { size?: number; glow?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow ? { filter: "drop-shadow(0 0 6px rgba(224,138,106,.55))" } : undefined} aria-hidden>
    <ellipse cx="12" cy="14.5" rx="9" ry="4.4" stroke="#e08a6a" strokeWidth="1.35" />
    <ellipse cx="12" cy="14.5" rx="4.6" ry="2.2" stroke="#e08a6a" strokeWidth="1" opacity=".55" />
    <circle cx="12" cy="10.4" r="1.7" fill="#e8cfc0" />
  </svg>
);

export function PensiveHero({ embedded = false }: { embedded?: boolean }) {
  const { flavor } = useFlavor();
  const { copied, copy } = useCopy(1600);
  const palette: PensivePalette = flavor === "ink" ? "ink" : "quill";
  // On the homepage the downloads live on the dedicated page; route there.
  const dlHref = embedded ? "/tools/pensive" : "#";

  return (
    <section
      data-screen-label="Hero"
      style={{
        position: "relative",
        height: embedded ? "auto" : "100vh",
        minHeight: embedded ? "560px" : "700px",
        overflow: "hidden",
        background: "#1c1812",
        color: "#efe9df",
        fontFamily: "'EB Garamond', Georgia, serif",
        WebkitFontSmoothing: "antialiased",
        padding: embedded ? "0 0 80px" : undefined,
      }}
    >
      <PensiveCanvas palette={palette} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />

      {/* legibility veils */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, rgba(28,24,18,.58) 0%, rgba(28,24,18,0) 26%, rgba(28,24,18,0) 52%, rgba(28,24,18,.34) 80%, rgba(28,24,18,.74) 100%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: 960,
          maxWidth: "94vw",
          height: 540,
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(28,24,18,.5) 0%, rgba(28,24,18,0) 64%)",
        }}
      />

      {!embedded && (
        <header
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px clamp(20px,5vw,56px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <PensiveMark />
            <span style={{ fontFamily: "'Newsreader', serif", fontSize: 23, fontWeight: 400, letterSpacing: ".01em", color: "#efe9df" }}>Pensive</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: "clamp(16px,2.6vw,34px)", fontFamily: "'EB Garamond', serif", fontSize: 16, color: "#c8bca4" }}>
            <a href="#features" style={{ opacity: 0.92 }}>Why Pensive</a>
            <a href="#download" style={{ opacity: 0.92 }}>Download</a>
            <Link href="/" style={{ opacity: 0.92 }}>Potter</Link>
            <a href="https://github.com/LucasStrand/potter-theme" target="_blank" rel="noreferrer" style={{ opacity: 0.92 }}>GitHub</a>
          </nav>
        </header>
      )}

      <div
        style={{
          position: embedded ? "relative" : "absolute",
          left: 0,
          right: 0,
          top: embedded ? undefined : "40%",
          transform: embedded ? undefined : "translateY(-50%)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: embedded ? "clamp(72px,10vh,120px) 24px 0" : "0 24px",
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: ".32em", color: "#e08a6a", animation: "penFade .9s ease .05s both" }}>
          CODE REVIEW, RECONSIDERED
        </div>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 300, fontSize: "clamp(44px,8vw,94px)", lineHeight: 1.02, letterSpacing: "-.015em", margin: "18px 0 0", color: "#f4eee2", animation: "penFade 1s ease .14s both" }}>
          Pour the diff in.
          <br />
          <span style={{ fontStyle: "italic", fontWeight: 400 }}>See what you missed.</span>
        </h1>
        <div style={{ width: 120, height: 2, margin: "26px 0 0", background: "linear-gradient(90deg,rgba(224,138,106,0),rgba(224,138,106,.75),rgba(224,138,106,0))", animation: "penFade 1s ease .3s both" }} />
        <p style={{ fontFamily: "'EB Garamond', serif", margin: "24px auto 0", maxWidth: "46ch", fontSize: "clamp(18px,2vw,23px)", lineHeight: 1.5, color: "#c8bca4", animation: "penFade 1s ease .34s both" }}>
          <span style={{ fontFamily: "'Newsreader', serif", fontStyle: "italic", fontSize: "1.12em", color: "#e8cfc0" }}>Pensive</span> — making code reviews a bit more zen, and a bit more thoughtful.
        </p>

        <div id={embedded ? undefined : "download"} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 13, marginTop: 40, animation: "penFade 1s ease .46s both" }}>
          <DownloadButton href={dlHref} primary icon={<AppleIcon />}>{embedded ? "Meet Pensive" : "Download for macOS"}</DownloadButton>
          <DownloadButton href={dlHref} icon={<WindowsIcon />}>Windows</DownloadButton>
          <DownloadButton href={dlHref} icon={<LinuxIcon />}>Linux</DownloadButton>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 22, animation: "penFade 1s ease .58s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 9px 9px 16px", borderRadius: 9, border: "1px solid rgba(91,78,58,.7)", background: "rgba(22,18,14,.6)", backdropFilter: "blur(6px)" }}>
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, color: "#e0b25a" }}>
              <span style={{ opacity: 0.55 }}>$</span> {INSTALL}
            </code>
            <button
              onClick={() => copy(INSTALL)}
              aria-label="Copy install command"
              style={{ border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: ".04em", padding: "6px 11px", borderRadius: 6, background: "rgba(224,138,106,.18)", color: "#f0c3a8" }}
            >
              {copied === INSTALL ? "copied" : "copy"}
            </button>
          </div>
          <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#a99e8d" }}>v1.4 · free while in beta</span>
        </div>
      </div>
    </section>
  );
}

function DownloadButton({ href, primary, icon, children }: { href: string; primary?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 9,
    fontFamily: "'EB Garamond', serif",
    fontSize: 17,
  };
  const style: React.CSSProperties = primary
    ? { ...base, padding: "14px 24px", background: "#e08a6a", color: "#1c1812", fontWeight: 600, boxShadow: "0 10px 32px -10px rgba(224,138,106,.55)" }
    : { ...base, padding: "14px 22px", border: "1px solid rgba(143,127,100,.45)", background: "rgba(42,34,24,.55)", color: "#e3dccb", backdropFilter: "blur(8px)" };
  if (href.startsWith("/")) {
    return (
      <Link href={href} style={style}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <a href={href} style={style}>
      {icon}
      {children}
    </a>
  );
}

const AppleIcon = () => (
  <svg width="16" height="18" viewBox="0 0 16 18" fill="#1c1812" aria-hidden>
    <path d="M11 0c.1 1.1-.34 2.2-1 3-.7.85-1.8 1.5-2.9 1.4-.12-1.05.4-2.16 1-2.85C8.85.7 10 .1 11 0Zm3.3 13.2c-.5 1.15-.74 1.66-1.4 2.68-.9 1.4-2.2 3.16-3.8 3.17-1.42.01-1.79-.93-3.72-.92-1.93.01-2.33.94-3.76.92-1.6-.02-2.82-1.6-3.73-3-2.53-3.9-2.8-8.48-1.24-10.92C-2.18 3.3-.6 2.3.88 2.28c1.5-.03 2.43.95 3.66.95 1.2 0 1.94-.95 3.7-.95 1.32 0 2.72.72 3.72 1.96-3.27 1.79-2.74 6.46.34 8.96Z" transform="translate(1,-1) scale(.9)" />
  </svg>
);
const WindowsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#c8bca4" aria-hidden>
    <path d="M0 2.2 6.5 1.3v6.3H0V2.2Zm0 11.6L6.5 14.7V8.4H0v5.4ZM7.3 1.2 16 0v7.6H7.3V1.2Zm0 13.6L16 16V8.4H7.3v6.4Z" />
  </svg>
);
const LinuxIcon = () => (
  <svg width="15" height="17" viewBox="0 0 15 17" fill="#c8bca4" aria-hidden>
    <path d="M7.5 0C5.9 0 5 1.5 5 3.2c0 .9.2 1.6.2 2.4 0 .7-.6 1.3-1.2 2.2C3.2 9 2 10.2 2 11.8c0 .5.1.9.3 1.2-.5.4-1.3.8-1.3 1.6 0 1 1.3 1.3 2.7 1.6 1 .2 1.7.8 2.7.8s1.9-.7 2.9-.9c1.3-.3 2.7-.5 2.7-1.6 0-.8-.8-1.2-1.3-1.6.2-.3.3-.7.3-1.2 0-1.6-1.2-2.8-2-4-.6-.9-1.2-1.5-1.2-2.2 0-.8.2-1.5.2-2.4C10 1.5 9.1 0 7.5 0Z" />
  </svg>
);
