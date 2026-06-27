// "Why Pensive" — the light paper band with three numbered virtues.
// Faithful to the Pensive Download Claude Design; self-contained styling.

const FEATURES = [
  { n: "01", title: "Quiet reader", body: "Diffs open in a focused, distraction-free view. No badges, no clutter — just the change." },
  { n: "02", title: "Context in reach", body: "Past discussion, related changes, and intent sit right beside the code when you need them." },
  { n: "03", title: "Intentional approvals", body: "Sign off when you mean it, not on autopilot. Or send it back for another look." },
];

export function PensiveFeatures() {
  return (
    <section
      id="features"
      data-screen-label="Features"
      style={{
        position: "relative",
        padding: "clamp(72px,11vw,140px) clamp(20px,6vw,80px)",
        background: "#faf9f5",
        backgroundImage:
          "radial-gradient(circle at 16% 18%, rgba(140,100,50,.05), rgba(140,100,50,0) 42%),radial-gradient(circle at 84% 78%, rgba(140,100,50,.06), rgba(140,100,50,0) 44%)",
        color: "#141413",
        fontFamily: "'EB Garamond', serif",
      }}
    >
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: ".3em", color: "#d77250" }}>WHY PENSIVE</div>
        <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 400, fontSize: "clamp(32px,5vw,56px)", lineHeight: 1.05, letterSpacing: "-.01em", margin: "14px 0 0", maxWidth: "18ch", color: "#141413" }}>
          Less noise. Fewer misses.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "clamp(20px,3vw,44px)", marginTop: "clamp(46px,6vw,76px)" }}>
          {FEATURES.map((f) => (
            <div key={f.n} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#d77250", letterSpacing: ".1em" }}>{f.n}</div>
              <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 26, margin: 0, color: "#141413" }}>{f.title}</h3>
              <p style={{ margin: 0, color: "#6b6357", fontSize: 18, lineHeight: 1.55 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
