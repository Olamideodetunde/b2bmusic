'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, FolderHeart, Play, Pause } from 'lucide-react';
import { Track } from '@/lib/db/types';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { useAudio } from '@/components/audio/GlobalAudioContext';
import { formatDuration } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';
import { CoverImage } from '@/components/ui/CoverImage';


/** Shortlisted tracks, opened from the navbar. */
function ProjectBin() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { projectTracks, toggleProject } = useWorkspace();
  const { currentTrack, isPlaying, playTrack, setQueue } = useAudio();


  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 hover:text-white hover:border-white/20 transition-colors"
        title="Project bin"
      >
        <FolderHeart className="w-3.5 h-3.5 text-brand-400" />
        <span className="font-mono tabular-nums">{projectTracks.length}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Project bin"
          className="absolute right-0 top-full mt-2 w-80 rounded-md bg-navy-850 border border-white/10 shadow-xl shadow-black/60 overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 h-9 border-b border-white/[0.06]">
            <span className="label-xs">Project Bin</span>
            <span className="text-[10px] font-mono tabular-nums text-slate-500">{projectTracks.length} tracks</span>
          </div>
          {projectTracks.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              Use <span className="font-mono text-slate-300">+</span> on any catalog row to shortlist tracks for this project.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {projectTracks.map(track => {
                const active = currentTrack?.id === track.id;
                return (
                  <li key={track.id} className="group flex items-center gap-2 h-9 px-2 hover:bg-white/[0.04]">
                    <button
                      onClick={() => { setQueue(projectTracks); playTrack(track); }}
                      className={`w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full ${
                        active ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.08]'
                      }`}
                      aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    >
                      {active && isPlaying ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-px" />}
                    </button>
                    {track.coverImageUrl && (
                      <CoverImage src={track.coverImageUrl} alt="" size={24} className="w-6 h-6 rounded-sm object-cover border border-white/10" />
                    )}
                    <Link
                      href={`/tracks/${track.slug}`}
                      onClick={() => setOpen(false)}
                      className={`flex-1 min-w-0 truncate text-[13px] ${active ? 'text-brand-300' : 'text-slate-200 hover:text-white'}`}
                    >
                      {track.title}
                    </Link>
                    <span className="text-[10px] font-mono tabular-nums text-slate-500">{formatDuration(track.durationSeconds)}</span>
                    <button
                      onClick={() => toggleProject(track.id)}
                      className="w-5 h-5 inline-flex items-center justify-center text-slate-600 hover:text-white"
                      aria-label={`Remove ${track.title} from project`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export interface NavGenre {
  name: string;
  slug: string;
  count: number;
}

export function Navbar({ genres }: { genres: NavGenre[] }) {
  // Top genres by catalog size, straight from the database.
  const NAV_LINKS = genres.slice(0, 4).map(g => ({ href: `/genres/${g.slug}`, label: g.name }));
  const { mobileNavOpen: mobileOpen, setMobileNavOpen: setMobileOpen } = useWorkspace();
  const pathname = usePathname();

  // Close the mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Over the homepage hero the bar starts transparent and solidifies on scroll.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const transparent = pathname === '/' && !scrolled && !mobileOpen;

  const linkClass = (href: string) =>
    `transition-colors ${pathname === href ? 'text-white' : 'hover:text-brand-400'}`;

  return (
    <header
      className={`sticky top-0 z-40 h-16 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
        transparent
          ? 'bg-transparent border-transparent'
          : 'bg-navy-950/85 backdrop-blur-2xl border-white/[0.08]'
      }`}
    >
      <div className="w-full h-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center shrink-0 group min-w-0" aria-label={`${BRAND.wordmark} — home`}>
          <Logo className="transition-opacity group-hover:opacity-90" />
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden md:flex items-center gap-5 xl:gap-7 whitespace-nowrap text-xs font-semibold uppercase tracking-wider font-mono text-slate-400">
          <Link href="/#catalog" className="hover:text-white transition-colors">Catalog</Link>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>{link.label}</Link>
          ))}
          <Link href="/pricing" className={`font-bold ${pathname === '/pricing' ? 'text-white' : 'text-brand-400 hover:text-white'} transition-colors`}>
            Pricing ($10+)
          </Link>
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2.5">
          <div className="hidden 2xl:inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>100% Pre-Cleared</span>
          </div>

          {/* On phones the bin moves into the menu so the logo lockup fits at 375px */}
          <div className="hidden sm:block">
            <ProjectBin />
          </div>

          <Link
            href="/#catalog"
            className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold px-4 h-8 rounded-full btn-primary text-white"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Catalog</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl bg-navy-900 text-slate-300 hover:text-white border border-white/10 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden bg-navy-950/95 backdrop-blur-2xl border-b border-white/10 px-4 py-3">
          <div className="sm:hidden flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
            <span className="label-xs">Project bin</span>
            <ProjectBin />
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-sm font-medium">
            {[{ href: '/#catalog', label: 'All Tracks' }, ...NAV_LINKS, { href: '/pricing', label: 'Pricing ($10+)' }].map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-md bg-navy-900/80 text-slate-300 hover:text-white hover:bg-navy-800 border border-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
