"use client";
// HTML → PDF spell (/spells/html-to-pdf).
// Put in an HTML page — paste the markup, upload an .html file, or drop one on
// the preview — and get a PDF out. Conversion uses the browser's own print
// engine (the most faithful HTML renderer there is): we stage the document in
// a hidden iframe with an injected @page rule for paper size, orientation and
// margins, then invoke print-to-PDF. Everything runs locally in the browser;
// the page never leaves the machine.

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const SAMPLE_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>My document</title>
  <style>
    body { font-family: Georgia, serif; max-width: 40em; margin: 3em auto; line-height: 1.6; color: #2a2320; }
    h1 { font-weight: 600; letter-spacing: -0.01em; }
    .accent { color: #b5683f; }
  </style>
</head>
<body>
  <h1>Paper &amp; ink<span class="accent">.</span></h1>
  <p>Replace this with your own page — paste markup, upload an .html file, or drop one onto the preview. Then convert, and pick “Save as PDF” as the destination.</p>
</body>
</html>`;

type Paper = "A4" | "Letter" | "Legal" | "A5";
type Orientation = "portrait" | "landscape";

const MARGINS = { none: 0, slim: 8, comfy: 16, wide: 25 } as const;
type MarginKey = keyof typeof MARGINS;

/** Inject the @page print rule into the source markup, right after <head> when
 *  there is one (so the page's own styles can still override it), else prepended
 *  — the HTML parser hoists a leading <style> into head. */
function withPageRule(src: string, paper: Paper, orientation: Orientation, marginMm: number): string {
  const css = `<style data-potter-spell>@page { size: ${paper} ${orientation}; margin: ${marginMm}mm; } html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style>`;
  const headOpen = /<head[^>]*>/i.exec(src);
  if (headOpen) {
    const at = headOpen.index + headOpen[0].length;
    return src.slice(0, at) + css + src.slice(at);
  }
  return css + src;
}

export function HtmlToPdf() {
  const [htmlText, setHtmlText] = useState(SAMPLE_HTML);
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [marginKey, setMarginKey] = useState<MarginKey>("comfy");
  const [docName, setDocName] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const intake = useCallback(async (file: File) => {
    if (!/html?$/i.test(file.name) && !/text\/html/i.test(file.type)) {
      setError("Please choose an .html file.");
      return;
    }
    setError(null);
    setHtmlText(await file.text());
    if (!docName) setDocName(file.name.replace(/\.html?$/i, ""));
  }, [docName]);

  // Stage the final document in the hidden frame, wait for subresources
  // (images, fonts) to settle, then hand off to the browser's print-to-PDF.
  const convert = useCallback(() => {
    const frame = printFrameRef.current;
    if (!frame || !htmlText.trim()) return;
    setBusy(true);
    setError(null);

    const doc = withPageRule(htmlText, paper, orientation, MARGINS[marginKey]);

    const onReady = () => {
      const win = frame.contentWindow;
      const fdoc = frame.contentDocument;
      if (!win || !fdoc) {
        setBusy(false);
        setError("Could not stage the document for printing.");
        return;
      }
      // The print dialog suggests the document title as the PDF file name.
      if (docName.trim()) fdoc.title = docName.trim();
      const fire = () => {
        try {
          win.focus();
          win.print();
        } catch {
          setError("The browser refused to open the print dialog for this page.");
        }
        setBusy(false);
      };
      const fonts = (fdoc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
      const settled = fonts?.ready ?? Promise.resolve();
      // Give lazy images/fonts a beat; print snapshots the frame as-is.
      settled.then(() => setTimeout(fire, 150));
    };

    frame.onload = onReady;
    frame.srcdoc = doc;
  }, [htmlText, paper, orientation, marginKey, docName]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--potter-base)", color: "var(--potter-text)" }}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        {/* top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg transition-opacity hover:opacity-70" style={{ color: "var(--potter-text)" }}>
            Potter<span style={{ color: "var(--site-accent, var(--potter-peach))" }}>.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--potter-subtext1)" }}>
            <Link href="/svgpng-converter" className="transition-opacity hover:opacity-70">SVG → PNG</Link>
            <Link href="/tools/wallpaper-converter" className="transition-opacity hover:opacity-70">Wallpaper</Link>
          </div>
        </div>

        <header className="mt-10 sm:mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--potter-overlay2)" }}>
            html → pdf
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-5xl" style={{ color: "var(--potter-text)" }}>
            Any page, pressed to paper
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg" style={{ color: "var(--potter-subtext0)" }}>
            Put in an HTML page and take out a PDF. Rendered by the browser&apos;s own engine — the truest
            HTML-to-PDF there is — with paper size, orientation and margins under your control. Nothing is uploaded.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* live preview */}
          <div>
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) intake(f);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              className="relative overflow-hidden rounded-2xl"
              style={{
                minHeight: 480,
                border: dragging
                  ? "2px dashed var(--site-accent, var(--potter-peach))"
                  : "1px solid var(--potter-surface0)",
                background: "#ffffff",
              }}
            >
              <iframe
                title="Page preview"
                sandbox="allow-same-origin"
                srcDoc={htmlText}
                className="block h-full w-full"
                style={{ minHeight: 480, border: 0, pointerEvents: dragging ? "none" : "auto" }}
              />
              {error && (
                <p
                  className="absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-center text-sm"
                  style={{ background: "rgb(var(--potter-crust-rgb) / 0.85)", color: "var(--potter-red)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
              preview is inert (scripts off) · {paper} {orientation} · margins {MARGINS[marginKey]}mm
            </p>
          </div>

          {/* controls */}
          <aside className="space-y-6">
            {/* source */}
            <div className="space-y-2">
              <Label>Source HTML</Label>
              <div className="flex gap-1.5">
                <label
                  className="flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-text)" }}
                >
                  Upload .html
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) intake(f);
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowPaste((s) => !s)}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{ background: "var(--potter-surface0)", color: "var(--potter-subtext1)" }}
                >
                  {showPaste ? "Hide" : "Paste"}
                </button>
              </div>
              {showPaste && (
                <textarea
                  value={htmlText}
                  onChange={(e) => setHtmlText(e.target.value)}
                  spellCheck={false}
                  className="h-40 w-full rounded-lg p-2 font-mono text-[11px] leading-snug"
                  style={{ background: "var(--potter-mantle)", color: "var(--potter-subtext1)", border: "1px solid var(--potter-surface0)" }}
                  placeholder="<!doctype html>…"
                />
              )}
              <p className="text-[11px]" style={{ color: "var(--potter-overlay2)" }}>or drop an .html file onto the preview</p>
            </div>

            {/* paper */}
            <div className="space-y-2">
              <Label>Paper</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["A4", "Letter", "Legal", "A5"] as const).map((p) => (
                  <Pill key={p} active={paper === p} onClick={() => setPaper(p)}>{p}</Pill>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={orientation === "portrait"} onClick={() => setOrientation("portrait")}>Portrait</Pill>
                <Pill active={orientation === "landscape"} onClick={() => setOrientation("landscape")}>Landscape</Pill>
              </div>
            </div>

            {/* margins */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Margins</Label>
                <span className="font-mono text-[11px]" style={{ color: "var(--potter-subtext1)" }}>{MARGINS[marginKey]}mm</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(MARGINS) as MarginKey[]).map((k) => (
                  <Pill key={k} active={marginKey === k} onClick={() => setMarginKey(k)}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </Pill>
                ))}
              </div>
            </div>

            {/* file name */}
            <div className="space-y-2">
              <Label>PDF name</Label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                spellCheck={false}
                placeholder="document"
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{ background: "var(--potter-mantle)", color: "var(--potter-text)", border: "1px solid var(--potter-surface0)" }}
              />
              <p className="text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
                suggested as the file name in the save dialog
              </p>
            </div>

            <button
              onClick={convert}
              disabled={busy || !htmlText.trim()}
              className="w-full cursor-pointer rounded-lg px-3 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--site-accent, var(--potter-peach))", color: "var(--potter-base)" }}
            >
              {busy ? "Preparing…" : "Convert to PDF"}
            </button>
            <p className="text-[11px]" style={{ color: "var(--potter-overlay2)" }}>
              choose “Save as PDF” as the destination · turn on “Background graphics” to keep colors
            </p>
          </aside>
        </div>
      </div>

      {/* Hidden staging frame the print engine snapshots. Unsandboxed on
          purpose: it holds only the user's own local page, same trust as
          opening the file in a tab, and sandboxing blocks print() in some
          browsers. */}
      <iframe ref={printFrameRef} title="Print staging" aria-hidden className="hidden" />
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
      onClick={onClick}
      className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--site-accent, var(--potter-peach))" : "var(--potter-surface0)",
        color: active ? "var(--potter-base)" : "var(--potter-subtext1)",
      }}
    >
      {children}
    </button>
  );
}
