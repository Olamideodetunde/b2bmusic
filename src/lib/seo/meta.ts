import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { getSiteUrl } from '@/lib/utils';

/** ≤ 60 characters: Google shows roughly this many before truncating. */
export const SITE_TITLE = `${BRAND.name} | Production Music & Sync Licensing`;
/** ≤ 155 characters. */
export const SITE_DESCRIPTION =
  'License pre-cleared production music for video, ads, film and podcasts: WAV & AIFF masters, stems and Content ID clearance, per track or all-access.';

/**
 * Complete Open Graph + Twitter tags for a page. Next.js replaces (not merges) a parent's
 * `openGraph` when a page sets its own, so every page must carry its own image and
 * siteName — this helper guarantees that, falling back to the brand share card.
 */
export function socialMeta(opts: {
  title: string;
  description: string;
  /** Absolute URL or site path. */
  url: string;
  /** Absolute URL or site path; defaults to the 1200×630 brand card. */
  image?: string;
  imageAlt?: string;
  /** Set when the image is known to be a 1200×630 card (the brand default always is). */
  imageIsCard?: boolean;
  type?: 'website' | 'music.song';
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const site = getSiteUrl();
  const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`);
  const isCard = !opts.image || opts.imageIsCard;
  const image = {
    url: abs(opts.image ?? BRAND.ogImagePath),
    alt: opts.imageAlt ?? opts.title,
    ...(isCard ? { width: 1200, height: 630 } : {}),
  };
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: abs(opts.url),
      siteName: BRAND.name,
      type: opts.type ?? 'website',
      locale: 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description, images: [image.url] },
  };
}
