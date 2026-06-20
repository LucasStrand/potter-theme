import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { FlavorProvider } from "./flavor-provider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://potter.nu"),
  title: "Potter — a warm paper & ink color theme",
  description:
    "Potter is a Catppuccin-grade color theme in three flavors — Parchment, Quill, Ink. 26 colors, one source of truth, for the web, your editor, your terminal, and your whole desktop.",
  keywords: ["color theme", "palette", "Catppuccin alternative", "Neovim", "VS Code", "Tailwind", "terminal", "Arch Linux"],
  authors: [{ name: "Potter" }],
  openGraph: {
    title: "Potter — paper & ink",
    description: "A warm, Catppuccin-grade color theme. Three flavors, twenty-six colors, one source of truth.",
    url: "https://potter.nu",
    siteName: "Potter",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Potter — paper & ink", description: "A warm, Catppuccin-grade color theme." },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1812" },
  ],
};

// Runs before paint: restore the saved flavor/accent so there's no flash.
const noFlash = `(function(){try{
  var f=localStorage.getItem('potter-flavor');
  if(!f){f=matchMedia('(prefers-color-scheme: light)').matches?'parchment':'quill';}
  document.documentElement.setAttribute('data-potter-flavor',f);
  var a=localStorage.getItem('potter-accent');
  if(a){document.documentElement.style.setProperty('--site-accent','var(--potter-'+a+')');document.documentElement.style.setProperty('--site-accent-rgb','var(--potter-'+a+'-rgb)');}
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-potter-flavor="quill" className={`${fraunces.variable} ${jbmono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <FlavorProvider>{children}</FlavorProvider>
      </body>
    </html>
  );
}
