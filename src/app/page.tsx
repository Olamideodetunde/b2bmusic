import React from 'react';
import { Metadata } from 'next';
import { getAllTracks } from '@/lib/db';
import { HeroSection } from '@/components/home/HeroSection';
import { UseCaseMarquee } from '@/components/home/UseCaseMarquee';
import { CuratedCollections } from '@/components/home/CuratedCollections';
import { ToolkitShowcase } from '@/components/home/ToolkitShowcase';
import { ClearanceSection } from '@/components/home/ClearanceSection';
import { PricingTeaser } from '@/components/home/PricingTeaser';
import { ClosingCta } from '@/components/home/ClosingCta';
import { Container, Reveal, SectionHeading, ArrowLink } from '@/components/home/primitives';
import { CatalogExplorer } from '@/components/hub/CatalogExplorer';
import { formatPrice, getSiteUrl } from '@/lib/utils';
import { LICENSE_TIERS, tierPriceCents, type LicenseTierKey } from '@/lib/licensing';
import { BRAND } from '@/lib/brand';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  return {
    title: `${BRAND.name} | Commercial Music Licensing for Video, Ads & Film`,
    description: 'Direct synchronization and commercial music licensing library. 100% pre-cleared master recordings with 24-bit WAV, isolated stems, broadcast cutdowns, and YouTube Content ID whitelist.',
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: `${BRAND.name} | Commercial Sync Licensing Library`,
      description: '100% pre-cleared commercial music licensing with stems, cutdowns, and YouTube Content ID protection. Perpetual licenses from $10.',
      url: siteUrl,
      siteName: BRAND.name,
      type: 'website',
      images: [
        {
          url: `${siteUrl}/brand/og-default.jpg`,
          width: 1200,
          height: 630,
          alt: `${BRAND.name} catalog`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${BRAND.name} | Commercial Music Licensing`,
      description: '100% pre-cleared commercial music licensing with stems, cutdowns, and YouTube Content ID protection.',
      images: [`${siteUrl}/brand/og-default.jpg`],
    },
  };
}

export default async function HomePage() {
  const tracks = await getAllTracks();
  const siteUrl = getSiteUrl();

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}${BRAND.logoPath}`,
    description: 'Commercial production music catalog and direct sync licensing provider for media, film, broadcast, and digital agencies.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: BRAND.contactEmail,
      contactType: 'customer support',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const stemCount = tracks.reduce((n, t) => n + t.stems.length, 0);
  // The toolkit demo needs a track with stems, alt-mixes and cue-sheet data (sheet-only tracks have none).
  const fromPrices = Object.fromEntries(
    LICENSE_TIERS.map(t => [t.key, tracks.length ? formatPrice(Math.min(...tracks.map(tr => tierPriceCents(tr, t.key)))).replace(/\.00$/, '') : "—"]),
  ) as Record<LicenseTierKey, string>;
  const toolkitTrack = tracks.find(t => t.stems.length > 0 && t.altMixes.length > 0 && t.syncMeta);

  return (
    <div className="bg-navy-950 text-white">
      {/* Search Engine Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <HeroSection tracks={tracks} />
      <UseCaseMarquee />
      <CuratedCollections tracks={tracks} />
      {toolkitTrack && <ToolkitShowcase track={toolkitTrack} />}

      {/* ─── Catalog ─── */}
      <section id="catalog" className="py-24 lg:py-32 border-t border-white/[0.06] scroll-mt-16">
        <Container>
          <SectionHeading
            eyebrow="The catalog"
            title={<>Audition. Filter. <span className="text-navy-300">License.</span></>}
            description={`${tracks.length} master recordings and ${stemCount} isolated stems — filter by tempo, key, mood and vocal, then scrub any waveform to audition.`}
            aside={<ArrowLink href="/pricing">Licenses from $10</ArrowLink>}
          />
          <Reveal>
            <div className="border border-white/[0.08] bg-navy-950">
              <CatalogExplorer initialTracks={tracks} />
            </div>
          </Reveal>
        </Container>
      </section>

      <ClearanceSection />
      <PricingTeaser fromPrices={fromPrices} />
      <ClosingCta />
    </div>
  );
}
