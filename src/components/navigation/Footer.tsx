import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-obsidian-950/90 border-t border-white/[0.08] text-zinc-400 text-sm py-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 relative overflow-hidden backdrop-blur-2xl w-full">
      {/* Background ambient crimson light */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-crimson-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-14 relative z-10">

        {/* Col 1: Brand */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-xl shadow-lg border border-white/10">
              <rect width="38" height="38" rx="8" fill="#0D0D14"/>
              <text x="7" y="25" fontFamily="monospace" fontWeight="900" fontSize="14" fill="#ffffff" letterSpacing="-1">B2B</text>
              <circle cx="32" cy="8" r="4" fill="#EF4444"/>
            </svg>
            <span className="font-syne font-black text-white text-sm">
              B2B<span className="text-crimson-500">Production</span>Music
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Programmatic commercial music catalog delivering instant, worldwide direct synchronization licenses for video agencies, podcasters, and enterprise brands.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Direct Sync · YouTube CID Cleared</span>
          </div>
        </div>

        {/* Col 2: Genre Hubs */}
        <div>
          <h4 className="font-syne text-xs font-bold uppercase tracking-widest text-white mb-4">Genre Hubs</h4>
          <ul className="space-y-2.5 text-xs font-medium">
            {[
              { href: '/genres/commercial-pop', label: 'Commercial Pop' },
              { href: '/genres/cinematic-hybrid', label: 'Cinematic Hybrid' },
              { href: '/genres/tech-ambient', label: 'Tech Ambient' },
              { href: '/genres/tech-lo-fi', label: 'Tech Lo-Fi' },
              { href: '/genres/acoustic-folk', label: 'Acoustic Folk' },
              { href: '/genres/minimalist-modern', label: 'Minimalist Modern' },
            ].map(link => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-crimson-400 transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Use-Case Hubs */}
        <div>
          <h4 className="font-syne text-xs font-bold uppercase tracking-widest text-white mb-4">Use Cases</h4>
          <ul className="space-y-2.5 text-xs font-medium">
            {[
              { href: '/use-cases/saas-product-demo', label: 'SaaS Product Demos' },
              { href: '/use-cases/investor-pitch-deck', label: 'Investor Pitch Decks' },
              { href: '/use-cases/tech-podcast', label: 'Tech & Business Podcasts' },
              { href: '/use-cases/tv-commercial', label: 'TV Commercial Advertising' },
              { href: '/use-cases/documentary-feature', label: 'Documentary Films' },
              { href: '/use-cases/luxury-real-estate', label: 'Luxury Real Estate' },
            ].map(link => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-crimson-400 transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4: Links & Contact */}
        <div>
          <h4 className="font-syne text-xs font-bold uppercase tracking-widest text-white mb-4">Platform</h4>
          <ul className="space-y-2.5 text-xs font-medium">
            <li>
              <Link href="/pricing" className="hover:text-crimson-400 transition-colors">Licensing & Pricing</Link>
            </li>
            <li>
              <Link href="/#catalog" className="hover:text-crimson-400 transition-colors">Full Catalog</Link>
            </li>
            <li>
              <a href="mailto:licensing@b2bproductionmusic.com" className="hover:text-crimson-400 transition-colors">
                licensing@b2bproductionmusic.com
              </a>
            </li>
            <li>
              <Link href="/sitemap.xml" className="hover:text-crimson-400 transition-colors inline-flex items-center gap-1">
                XML Sitemap <ArrowUpRight className="w-3 h-3" />
              </Link>
            </li>
          </ul>
          <div className="mt-5 text-xs text-zinc-500">
            Developer: <span className="text-zinc-300 font-semibold">Alvan Esiaka</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full max-w-[1600px] mx-auto pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4 relative z-10">
        <div>© {new Date().getFullYear()} B2BProductionMusic.com. All rights reserved.</div>
        <div className="flex gap-6 font-medium">
          <Link href="/genres/cinematic-hybrid" className="hover:text-crimson-400 transition-colors">Genres</Link>
          <Link href="/use-cases/tech-podcast" className="hover:text-crimson-400 transition-colors">Use Cases</Link>
          <Link href="/pricing" className="hover:text-crimson-400 transition-colors">Pricing</Link>
          <Link href="/sitemap.xml" className="hover:text-crimson-400 transition-colors">Sitemap</Link>
        </div>
      </div>
    </footer>
  );
}
