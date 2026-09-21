import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Zap, Globe, Tv, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Licensing Tiers — B2B Production Music',
  description: 'Simple, transparent sync licensing from $10. Web & Social, Broadcast & Sync, Full Buyout. Perpetual worldwide rights. Instant download.',
};

const tiers = [
  {
    key: 'web',
    label: 'Web & Social',
    price: '$10',
    icon: <Globe className="w-6 h-6" />,
    color: 'text-zinc-400',
    popular: false,
    description: 'Perfect for content creators, YouTubers, podcasters, and internal corporate video.',
    features: [
      'Unlimited online views & streams',
      'Full Master WAV (24-bit / 48kHz)',
      'YouTube Content ID Whitelist',
      'Single project perpetual license',
      'Cue sheet & ISRC documentation',
    ],
    footer: 'One project · Online & social media only',
  },
  {
    key: 'broadcast',
    label: 'Broadcast & Sync',
    price: '$20',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-crimson-400',
    popular: true,
    description: 'For agencies, paid digital campaigns, trade shows, and client deliverables.',
    features: [
      'All Web rights + Paid Digital Ads',
      'Full Stems Archive (all instruments)',
      'All Alt-Mixes & Cutdowns (:60, :30, :15)',
      'Agency client transfer rights',
      'Priority email support',
    ],
    footer: 'Client handover transfer permitted',
  },
  {
    key: 'buyout',
    label: 'Full Buyout',
    price: '$40',
    icon: <Tv className="w-6 h-6" />,
    color: 'text-red-400',
    popular: false,
    description: 'TV commercials, OTT streaming series, theatrical films, and games.',
    features: [
      'Worldwide TV & OTT Synchronization',
      'Unlimited media / advertising spend',
      'Full Stems + all broadcast cuts',
      'Complete legal indemnification',
      'Official Cue Sheet & ISRC registration',
    ],
    footer: 'Unlimited usage · worldwide · perpetual',
  },
];

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
    a: 'Yes. Contact licensing@b2bproductionmusic.com for custom volume deals, catalog subscriptions, or exclusive buyouts.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen text-white relative">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-crimson-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 text-center w-full">
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-crimson-950/60 text-crimson-300 border border-crimson-800/70 mb-8 shadow-lg shadow-crimson-950/50 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson-400 animate-ping" />
            Simple Transparent Licensing
          </div>
          <h1 className="font-syne text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight mb-4">
            One Track. <span className="text-crimson-gradient">Three Tiers.</span>
            <br />No Subscriptions.
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto font-jakarta">
            Perpetual worldwide rights from $10 per track. Instant download. No recurring membership required.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 pb-24 w-full">
        <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative rounded-3xl p-8 flex flex-col glass-panel transition-all duration-300 card-hover shine-sweep ${
                tier.popular
                  ? 'border-2 border-crimson-600 shadow-2xl shadow-crimson-950/80 scale-[1.02] ring-1 ring-crimson-500/50'
                  : 'border border-white/10 hover:border-white/20 shadow-xl'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-crimson-600 to-crimson-500 text-white text-[10px] font-mono font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-crimson-600/50">
                  Most Popular
                </div>
              )}

              <div className={`${tier.color} mb-4`}>{tier.icon}</div>
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{tier.label}</div>
              <div className="font-mono text-5xl sm:text-6xl font-black text-white mb-1">{tier.price}</div>
              <div className="font-mono text-xs text-zinc-400 mb-4">per track · perpetual license</div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6 font-jakarta">{tier.description}</p>

              <ul className="space-y-3.5 text-sm text-zinc-200 mb-8 font-jakarta">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-crimson-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/#catalog"
                  className={`w-full flex items-center justify-center gap-2 font-extrabold text-sm px-6 py-4 rounded-2xl transition-all shine-sweep ${
                    tier.popular
                      ? 'btn-crimson text-white shadow-xl shadow-crimson-600/30'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>Browse Tracks</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-center text-[10px] font-mono text-zinc-400 mt-3">{tier.footer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-b border-white/10 py-12 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 glass-panel bg-obsidian-950/40 backdrop-blur-md w-full">
        <div className="w-full max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-6 text-xs sm:text-sm text-zinc-300 font-mono">
          {[
            { icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />, text: '100% Direct Pre-Cleared' },
            { icon: <CheckCircle2 className="w-5 h-5 text-crimson-400" />, text: 'No CMO / PRO Entanglements' },
            { icon: <Globe className="w-5 h-5 text-sky-400" />, text: 'Perpetual Worldwide Rights' },
            { icon: <Zap className="w-5 h-5 text-amber-400" />, text: 'Instant ZIP Download' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-mono font-bold text-crimson-400 uppercase tracking-widest">FAQ</span>
            <h2 className="font-syne text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">Licensing Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl glass-card border border-white/10 p-6 hover:border-crimson-500/40 transition-colors card-hover">
                <h3 className="font-syne text-base font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-300 leading-relaxed font-jakarta">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="mt-14 rounded-3xl glass-panel border border-crimson-600/30 bg-gradient-to-br from-crimson-950/30 via-obsidian-900/60 to-obsidian-950 p-10 text-center shadow-2xl relative overflow-hidden shine-sweep">
            <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />
            <h3 className="font-syne text-2xl sm:text-3xl font-black text-white mb-2 relative z-10">Need Enterprise or Custom Catalog Licensing?</h3>
            <p className="text-base text-zinc-300 mb-6 max-w-xl mx-auto font-jakarta relative z-10">Volume discounts, exclusive rights, and catalog subscriptions available for agencies and broadcasters.</p>
            <a
              href="mailto:licensing@b2bproductionmusic.com?subject=Enterprise%20Licensing%20Inquiry"
              className="btn-crimson inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-sm sm:text-base shadow-xl shadow-crimson-600/30 relative z-10 hover:scale-105 transition-transform"
            >
              <span>Contact Licensing Team</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
