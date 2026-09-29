import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Container } from '@/components/home/primitives';
import { Logo } from '@/components/brand/Logo';
import { BRAND, mailto } from '@/lib/brand';

export interface FooterLink {
  href: string;
  label: string;
}

const PLATFORM_LINKS: FooterLink[] = [
  { href: '/#catalog', label: 'Full catalog' },
  { href: '/genres', label: 'All genres' },
  { href: '/use-cases', label: 'All use cases' },
  { href: '/bpm', label: 'Browse by tempo' },
  { href: '/pricing', label: 'Licensing & pricing' },
  { href: mailto(), label: 'Contact licensing' },
  { href: '/sitemap.xml', label: 'Sitemap' },
];

/** Genre and use-case columns are passed in from the root layout (live from the database). */
export function Footer({ genres, useCases, tempos }: { genres: FooterLink[]; useCases: FooterLink[]; tempos: FooterLink[] }) {
  const COLUMNS = [
    { heading: 'Genres', links: genres },
    { heading: 'Use cases', links: useCases },
    { heading: 'Platform', links: [...tempos, ...PLATFORM_LINKS] },
  ].filter(col => col.links.length > 0);
  return (
    <footer className="border-t border-white/[0.08] bg-navy-950">
      <Container className="pt-16 lg:pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-x-8 gap-y-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 max-w-xs">
            <Link href="/" className="inline-flex items-center" aria-label={`${BRAND.wordmark} — home`}>
              <Logo size="md" />
            </Link>
            <p className="mt-5 text-sm text-slate-400 leading-relaxed">
              Pre-cleared production music with stems, cutdowns and cue-sheet metadata — licensed per track for agencies,
              editors and brands.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% direct sync · YouTube Content ID cleared
            </div>
          </div>

          {COLUMNS.map(col => (
            <div key={col.heading}>
              <h4 className="label-xs !text-slate-500 mb-5">{col.heading}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} {BRAND.wordmark}. All rights reserved.</span>
          <span>
            Developer: <span className="text-slate-400">Alvan Esiaka</span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
