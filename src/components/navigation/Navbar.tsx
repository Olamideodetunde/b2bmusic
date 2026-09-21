'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X, Disc3 } from 'lucide-react';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-obsidian-950/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          {/* Wordmark SVG logo with glowing crimson neon dot */}
          <div className="relative">
            <div className="absolute -inset-1 bg-crimson-600/30 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg"
              className="relative transition-transform group-hover:scale-105 rounded-xl border border-white/15 shadow-xl">
              <rect width="38" height="38" rx="10" fill="#0D0D14"/>
              <rect width="38" height="38" rx="10" fill="url(#logoGrad)" fillOpacity="0.25"/>
              <text x="7" y="25" fontFamily="monospace" fontWeight="900" fontSize="14" fill="#FFFFFF" letterSpacing="-1">B2B</text>
              <circle cx="31" cy="8" r="4" fill="#EF4444"/>
              <circle cx="31" cy="8" r="7" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.4"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="38" y2="38">
                  <stop stopColor="#DC2626"/>
                  <stop offset="1" stopColor="#060608"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-syne font-black text-white text-sm tracking-tight leading-none drop-shadow-sm">
              B2B<span className="text-crimson-500">Production</span>Music
            </span>
            <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-semibold mt-0.5">
              Commercial Sync Catalog
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">All Tracks</Link>
          <Link href="/genres/cinematic-hybrid" className="hover:text-crimson-400 transition-colors">Cinematic</Link>
          <Link href="/genres/tech-ambient" className="hover:text-crimson-400 transition-colors">Corporate</Link>
          <Link href="/genres/commercial-pop" className="hover:text-crimson-400 transition-colors">Commercial</Link>
          <Link href="/use-cases/tech-podcast" className="hover:text-crimson-400 transition-colors">Podcasts</Link>
          <Link href="/pricing" className="hover:text-crimson-400 transition-colors">Pricing</Link>
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-3">
          <Link
            href="/#catalog"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl btn-crimson text-white shadow-xl shadow-crimson-600/30 border border-white/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Browse Catalog</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl bg-obsidian-900 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden bg-obsidian-950/95 backdrop-blur-2xl border-b border-white/10 px-4 py-4 space-y-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              All Tracks
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              Pricing ($10+)
            </Link>
            <Link
              href="/genres/cinematic-hybrid"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              Cinematic
            </Link>
            <Link
              href="/genres/commercial-pop"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              Commercial
            </Link>
            <Link
              href="/genres/tech-ambient"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              Corporate
            </Link>
            <Link
              href="/use-cases/tech-podcast"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl bg-obsidian-900/80 text-zinc-300 hover:text-white hover:bg-obsidian-800 border border-white/5 transition-colors"
            >
              Podcasts
            </Link>
          </div>
          <Link
            href="/#catalog"
            onClick={() => setMobileOpen(false)}
            className="block text-center btn-crimson text-white text-xs font-bold py-2.5 rounded-xl shadow-xl shadow-crimson-600/30"
          >
            Explore Master Tracks
          </Link>
        </div>
      )}
    </header>
  );
}
