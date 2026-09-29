import React from 'react';

const USE_CASES = [
  'SaaS product launches',
  'Broadcast TV spots',
  'Feature documentaries',
  'Tech & business podcasts',
  'Keynote openers',
  'Trailers & teasers',
  'Brand films',
  'Paid social campaigns',
];

/** Continuous strip of production contexts; pauses on hover, static for reduced motion. */
export function UseCaseMarquee() {
  return (
    <section aria-label="Scored for" className="group border-y border-white/[0.06] py-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max motion-safe:animate-marquee group-hover:[animation-play-state:paused]">
        {[0, 1].map(copy => (
          <ul key={copy} aria-hidden={copy === 1} className="flex items-center shrink-0">
            {USE_CASES.map(item => (
              <li key={item} className="flex items-center gap-10 pr-10">
                <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-navy-500 transition-colors duration-500 hover:text-white whitespace-nowrap">
                  {item}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
