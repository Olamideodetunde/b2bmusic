/**
 * Single source of truth for brand identity. Change the name, domain or contact
 * address here and every page title, schema block, email and footer follows.
 * Colors mirror the Tailwind `brand` / `gold` / `navy` scales (tailwind.config.ts),
 * which are sampled from the GlobalB2BAudioHolding logo.
 */
export const BRAND = {
  /** Human-readable name for titles, Open Graph siteName and schema.org. */
  name: 'Global B2B Audio Holding',
  /** The logo lockup, as written in the wordmark. */
  wordmark: 'GlobalB2BAudioHolding.com',
  domain: 'globalb2baudioholding.com',
  tagline: 'Music • Licensing • Sync',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'licensing@globalb2baudioholding.com',
  /** Full logo on white — used for schema.org Organization.logo and emails. */
  logoPath: '/brand/logo.jpg',
  /** 1200×630 share card (logo on white) — default Open Graph / Twitter image. */
  ogImagePath: '/brand/og-default.jpg',
  /** Square mark — favicon / app icon source. */
  markPath: '/brand/logo-mark.svg',
  colors: {
    navy: '#102038',
    blue: '#0a64f0',
    blueBright: '#2a7bff',
    gold: '#cfa044',
    goldDeep: '#b98a3a',
    surface: '#050b17',
  },
} as const;

export function mailto(subject?: string): string {
  return subject ? `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(subject)}` : `mailto:${BRAND.contactEmail}`;
}
