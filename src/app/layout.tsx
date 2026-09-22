import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/audio/GlobalAudioContext";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { MiniPlayerBar } from "@/components/audio/MiniPlayerBar";
import { getSiteUrl } from "@/lib/utils";

// ── Display / Headers: Syne ──────────────────────────────
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

// ── Body / Interface: Plus Jakarta Sans ──────────────────
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

// ── Technical / DAW Badges: JetBrains Mono ──────────────
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "B2B Production Music | Commercial Music Licensing for Video & Media",
    template: "%s | B2B Production Music",
  },
  description: "Direct synchronization and commercial music licensing for tech companies, video agencies, podcasts, and commercial broadcasts.",
  keywords: ["production music", "commercial music licensing", "sync licensing", "corporate background music", "b2b audio library"],
  authors: [{ name: "Alvan Esiaka" }],
  openGraph: {
    title: "B2B Production Music | Commercial Music Licensing",
    description: "High-quality, commercially cleared production music with direct sync licenses and YouTube Content ID protection.",
    siteName: "B2B Production Music",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="bg-obsidian-950 text-zinc-100 flex flex-col min-h-screen antialiased pb-16 font-jakarta selection:bg-crimson-600/30 selection:text-white">
        <AudioProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <MiniPlayerBar />
          <Footer />
        </AudioProvider>
      </body>
    </html>
  );
}
