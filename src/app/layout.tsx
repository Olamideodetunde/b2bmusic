import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/audio/GlobalAudioContext";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { MiniPlayerBar } from "@/components/audio/MiniPlayerBar";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceContext";
import { StemsDrawer } from "@/components/workspace/StemsDrawer";
import { getAllTracks } from "@/lib/db";
import { getSiteUrl, toSlug, isIndexable } from "@/lib/utils";
import { BPM_BANDS } from "@/lib/catalog/taxonomy";
import { BRAND } from '@/lib/brand';

// ── Brand + headings: Montserrat (the logo typeface) ────
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-brand",
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
    default: `${BRAND.name} | Commercial Music Licensing for Video & Media`,
    template: `%s | ${BRAND.name}`,
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
    index: isIndexable(),
    follow: isIndexable(),
    googleBot: {
      index: isIndexable(),
      follow: isIndexable(),
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: `${BRAND.name} | Commercial Music Licensing`,
    description: "High-quality, commercially cleared production music with direct sync licenses and YouTube Content ID protection. Perpetual licenses from $10.",
    siteName: BRAND.name,
    type: "website",
    images: [
      {
        url: "/brand/og-default.jpg",
        width: 1200,
        height: 630,
        alt: `${BRAND.name} catalog`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} | Commercial Music Licensing`,
    description: "High-quality, commercially cleared production music with direct sync licenses and YouTube Content ID protection.",
    images: ["/brand/og-default.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nav/footer links come from the live catalog, so they never point at empty hubs.
  const tracks = await getAllTracks();
  const genreCounts = new Map<string, number>();
  const useCaseCounts = new Map<string, number>();
  for (const t of tracks) {
    genreCounts.set(t.genre, (genreCounts.get(t.genre) ?? 0) + 1);
    for (const u of t.useCases) useCaseCounts.set(u, (useCaseCounts.get(u) ?? 0) + 1);
  }
  const byCount = <T,>(m: Map<T, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const genres = byCount(genreCounts).map(([name, count]) => ({ name, count, slug: toSlug(name) }));
  const tempos = BPM_BANDS.filter(b => tracks.some(t => t.bpm >= b.min && t.bpm <= b.max)).map(b => ({ href: `/bpm/${b.slug}`, label: `${b.short} · ${b.label}` }));
  const topUseCases = byCount(useCaseCounts).slice(0, 6).map(([name]) => ({ href: `/use-cases/${toSlug(name)}`, label: name }));

  return (
    <html
      lang="en"
      className={`dark ${jakarta.variable} ${jetbrains.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Flags JS before first paint so scroll-reveal content never hides without it */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      {/* pb-[72px] reserves room for the fixed audio dock */}
      <body className="min-h-screen bg-navy-950 text-slate-100 flex flex-col antialiased pb-[72px] font-jakarta selection:bg-brand-600/30 selection:text-white">
        <AudioProvider>
          <WorkspaceProvider>
            <Navbar genres={genres} />
            <main className="flex-1">
              {children}
            </main>
            <Footer genres={genres.map(g => ({ href: `/genres/${g.slug}`, label: g.name }))} useCases={topUseCases} tempos={tempos} />
            <MiniPlayerBar />
            <StemsDrawer />
          </WorkspaceProvider>
        </AudioProvider>
      </body>
    </html>
  );
}
