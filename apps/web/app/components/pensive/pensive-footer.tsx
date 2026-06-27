// Pensive footer — the dark closing band. Faithful to the Claude Design.
import Link from "next/link";

export function PensiveFooter() {
  return (
    <footer
      style={{
        position: "relative",
        padding: "clamp(40px,6vw,60px) clamp(20px,6vw,80px)",
        background: "#120f0a",
        borderTop: "1px solid rgba(224,138,106,.16)",
        fontFamily: "'EB Garamond', serif",
      }}
    >
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <ellipse cx="12" cy="14.5" rx="9" ry="4.4" stroke="#e08a6a" strokeWidth="1.35" opacity=".85" />
            <circle cx="12" cy="10.4" r="1.7" fill="#e08a6a" />
          </svg>
          <span style={{ fontFamily: "'Newsreader', serif", fontSize: 19, color: "#efe9df" }}>Pensive</span>
          <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 15, color: "#a99e8d", marginLeft: 6 }}>paper &amp; ink, for diffs</span>
        </div>
        <nav style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 22, fontFamily: "'EB Garamond', serif", fontSize: 16, color: "#a99e8d" }}>
          <a href="#">Changelog</a>
          <a href="#">Docs</a>
          <a href="https://github.com/LucasStrand/potter-theme" target="_blank" rel="noreferrer">GitHub</a>
          <a href="#">Privacy</a>
          <Link href="/">Potter</Link>
          <span style={{ color: "#786850" }}>© 2026 Pensive</span>
        </nav>
      </div>
    </footer>
  );
}
