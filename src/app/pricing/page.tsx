import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Minus, Zap, Globe, Tv } from 'lucide-react';
import { formatPrice, getSiteUrl } from '@/lib/utils';
import { getAllTracks } from '@/lib/db';
import { LICENSE_TIERS, tierPriceCents, type LicenseTierKey } from '@/lib/licensing';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Container, Eyebrow, Reveal } from '@/components/home/primitives';
import { ClosingCta } from '@/components/home/ClosingCta';
import { BRAND, mailto } from '@/lib/brand';
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  return {
    title: `Commercial Sync Licensing Pricing & Tiers | ${BRAND.name}`,
    description: 'Simple, transparent sync licensing from $10. Web & Social, Commercial Ads, Full Buyout. Perpetual worldwide rights. Master WAV & isolated stems included.',
    alternates: {
      canonical: `${siteUrl}/pricing`,
    },
    openGraph: {
      title: `Commercial Sync Licensing Tiers | ${BRAND.name}`,
      description: 'Simple flat-fee sync licensing. $10 Web, $20 Commercial Ads, $40 Broadcast TV. Perpetual worldwide rights.',
      url: `${siteUrl}/pricing`,
      siteName: BRAND.name,
      type: 'website',
      images: [
        {
          url: `${siteUrl}/banners/banner-crowd-amber.jpg`,
          width: 1200,
          height: 630,
          alt: 'Commercial Sync Licensing Tiers',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Commercial Sync Licensing Tiers | ${BRAND.name}`,
      description: 'Simple flat-fee sync licensing from $10. Perpetual worldwide rights.',
      images: [`${siteUrl}/banners/banner-crowd-amber.jpg`],
    },
  };
}

const TIER_ICONS = {
  standard: <Globe className="w-6 h-6" />,
  commercial: <Zap className="w-6 h-6" />,
  broadcast: <Tv className="w-6 h-6" />,
} as const;
const TIER_COLORS = { standard: 'text-slate-400', commercial: 'text-brand-400', broadcast: 'text-gold-400' } as const;


const faqs = [
  {
    q: 'Do I need a subscription?',
    a: 'No. Every license is a one-time purchase. Pay once, use forever on your selected project. No recurring fees.',
  },
  {
    q: 'What is YouTube Content ID Whitelisting?',
    a: 'We register your license with our Content ID system so YouTube will never flag or claim revenue on your video. This is included on all tiers.',
  },
  {
    q: 'Can I use the track for multiple projects?',
    a: 'Each license covers a single project. Purchase one license per video or campaign. There are no limits on views or streams.',
  },
  {
    q: 'What does "Full Stems" mean?',
    a: 'Stems are the individual instrument tracks — Drums, Bass, Synths, Guitars, FX — delivered as 24-bit WAV files so you can remix, duck, or isolate elements for perfect mix-to-picture.',
  },
  {
    q: 'Is there an enterprise or volume pricing option?',
    a: `Yes. Contact ${BRAND.contactEmail} for custom volume deals, catalog subscriptions, or exclusive buyouts.`,
  },
];

export default async function PricingPage() {
  // "From" price per tier = the lowest price in the live catalog (set per track in the sheet).
  const catalog = await getAllTracks();
  const minPrice = (key: LicenseTierKey) =>
    catalog.length ? Math.min(...catalog.map(t => tierPriceCents(t, key))) : null;
  const tiers = LICENSE_TIERS.map(t => {
    const cents = minPrice(t.key);
    return {
      key: t.key,
      label: `${t.name} · ${t.label}`,
      price: cents === null ? '—' : formatPrice(cents).replace(/\.00$/, ''),
      icon: TIER_ICONS[t.key],
      color: TIER_COLORS[t.key],
      popular: t.key === 'commercial',
      description: t.summary,
      footer: t.scope,
    };
  });
  const siteUrl = getSiteUrl();
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  // Capability matrix derived from the tier copy above (one row per right).
  const matrix: { label: string; included: [boolean, boolean, boolean] }[] = [
    { label: 'Unlimited online views & streams', included: [true, true, true] },
    { label: 'Master WAV (24-bit / 48kHz)', included: [true, true, true] },
    { label: 'YouTube Content ID whitelist', included: [true, true, true] },
    { label: 'Cue sheet & ISRC documentation', included: [true, true, true] },
    { label: 'Paid digital advertising', included: [false, true, true] },
    { label: 'Full isolated stems archive', included: [false, true, true] },
    { label: 'Alt-mixes & cutdowns (:60 / :30 / :15)', included: [false, true, true] },
    { label: 'Worldwide TV & OTT synchronization', included: [false, false, true] },
    { label: 'Complete legal indemnification', included: [false, false, true] },
  ];

  const cols = 'grid grid-cols-[minmax(220px,1.3fr)_repeat(3,minmax(160px,1fr))]';

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PageHeader
        crumbs={[{ href: '/', label: 'Home' }, { label: 'Licensing' }]}
        eyebrow="Licensing & rights"
        title={<>One track. One fee. <span className="text-navy-300">Yours to keep.</span></>}
        description="Per-track perpetual licenses — one project per license, no subscription, no renewal dates. Every tier is 100% one-stop cleared."
      />

      {/* ─── Rights matrix ─── */}
      <section className="py-12 lg:py-16" aria-label="License tier comparison">
        <Container>
          <Reveal>
            <div className="rounded-2xl border border-white/[0.08] overflow-x-auto">
              <div className="min-w-[720px]" role="table">
                {/* Tier headers */}
                <div className={`${cols} border-b border-white/[0.08]`} role="row">
                  <div className="px-6 py-6 label-xs self-end">Right / deliverable</div>
                  {tiers.map((tier) => (
                    <div
                      key={tier.key}
                      role="columnheader"
                      className={`relative px-6 py-6 border-l border-white/[0.06] ${tier.popular ? 'bg-brand-600/[0.06]' : ''}`}
                    >
                      {tier.popular && <span className="absolute inset-x-0 top-0 h-px bg-brand-500" />}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-200">{tier.label}</span>
                        {tier.popular && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-brand-400">Most chosen</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-5">
                        <span className="text-xs font-mono text-slate-500">From</span>
                        <span className="text-4xl font-mono font-medium tabular-nums tracking-tight text-white">{tier.price}</span>
                        <span className="text-xs font-mono text-slate-500">/ track</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-3">{tier.description}</p>
                    </div>
                  ))}
                </div>

                {/* Capability rows */}
                {matrix.map((row) => (
                  <div key={row.label} className={`${cols} border-b border-white/[0.05] transition-colors hover:bg-white/[0.02]`} role="row">
                    <div className="px-6 py-3.5 text-sm text-slate-300">{row.label}</div>
                    {row.included.map((on, i) => (
                      <div
                        key={i}
                        className={`px-6 py-3.5 border-l border-white/[0.06] flex items-center ${tiers[i].popular ? 'bg-brand-600/[0.06]' : ''}`}
                      >
                        {on ? (
                          <Check className="w-4 h-4 text-brand-400" aria-label="Included" />
                        ) : (
                          <Minus className="w-4 h-4 text-navy-500" aria-label="Not included" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Scope + action */}
                <div className={cols} role="row">
                  <div className="px-6 py-6 label-xs self-center">Scope</div>
                  {tiers.map((tier) => (
                    <div
                      key={tier.key}
                      className={`px-6 py-6 border-l border-white/[0.06] ${tier.popular ? 'bg-brand-600/[0.06]' : ''}`}
                    >
                      <p className="text-xs text-slate-400 leading-snug">{tier.footer}</p>
                      <Link
                        href="/#catalog"
                        className={`group mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
                          tier.popular
                            ? 'bg-brand-600 hover:bg-brand-500 text-white'
                            : 'border border-white/15 text-slate-200 hover:text-white hover:border-white/40'
                        }`}
                      >
                        Browse catalog
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 lg:py-28 border-t border-white/[0.06]">
        <Container>
          <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20">
            <Reveal>
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.04]">
                Licensing <span className="text-navy-300">questions.</span>
              </h2>
              <p className="mt-5 text-base text-slate-400 leading-relaxed max-w-sm">
                Need volume, exclusive or catalog-wide terms? Our licensing team replies within one business day.
              </p>
              <a
                href={mailto('Enterprise Licensing Inquiry')}
                className="mt-6 inline-block font-mono text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                {BRAND.contactEmail}
              </a>
            </Reveal>

            <Reveal delay={120}>
              <div className="border-t border-white/[0.08]">
                {faqs.map((faq) => (
                  <details key={faq.q} className="group border-b border-white/[0.08]">
                    <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none text-lg font-medium tracking-tight text-slate-100 hover:text-white [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <span className="relative w-4 h-4 shrink-0">
                        <span className="absolute top-1/2 left-0 w-4 h-px bg-slate-400" />
                        <span className="absolute top-1/2 left-0 w-4 h-px bg-slate-400 rotate-90 transition-transform duration-300 group-open:rotate-0" />
                      </span>
                    </summary>
                    <p className="pb-6 pr-10 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <ClosingCta />
    </div>
  );
}
