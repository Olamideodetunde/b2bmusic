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
  description: "Direct synchronization and commercial music licensing for tech companies, video agencies, podcasts, and commercial broadcasts. 100% pre-cleared master WAVs & isolated stems.",
  keywords: [
    "production music",
    "commercial music licensing",
    "sync licensing",
    "corporate background music",
    "b2b audio library",
    "royalty free music stems",
    "broadcast music library",
    "commercial soundtrack licensing",
    "youtube content id safe music"
  ],
  authors: [{ name: "Alvan Esiaka" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "B2B Production Music | Commercial Music Licensing",
    description: "High-quality, commercially cleared production music with direct sync licenses and YouTube Content ID protection. Perpetual licenses from $10.",
    siteName: "B2B Production Music",
    type: "website",
    images: [
      {
        url: "/banners/banner-spark-energy.jpg",
        width: 1200,
        height: 630,
        alt: "B2B Production Music Catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "B2B Production Music | Commercial Music Licensing",
    description: "High-quality, commercially cleared production music with direct sync licenses and YouTube Content ID protection.",
    images: ["/banners/banner-spark-energy.jpg"],
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
