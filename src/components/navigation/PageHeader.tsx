import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container, Eyebrow } from '@/components/home/primitives';
import { CoverImage } from '@/components/ui/CoverImage';

interface Crumb {
  href?: string;
  label: string;
}

interface PageHeaderProps {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  /** Optional backdrop photo — graded to monochrome like the landing page. */
  image?: string;
  stats?: { value: string; label: string }[];
  actions?: React.ReactNode;
}

/** Editorial page header shared by hub, pricing and utility pages. */
export function PageHeader({ crumbs, eyebrow, title, description, image, stats, actions }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06]">
      {image && (
        <div className="absolute inset-0" aria-hidden>
          <CoverImage
            fill
            priority
            src={image}
            alt=""
            className="object-cover grayscale contrast-[1.15] brightness-[0.45] motion-safe:animate-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent" />
        </div>
      )}

      <Container className={`relative ${image ? 'pt-16 pb-12 lg:pt-24 lg:pb-16' : 'pt-12 pb-10 lg:pt-16 lg:pb-12'}`}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="enter-up flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mb-8">
            {crumbs.map((c, i) => (
              <React.Fragment key={`${c.label}-${i}`}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-navy-500" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-white transition-colors">{c.label}</Link>
                ) : (
                  <span className={i === crumbs.length - 1 ? 'text-slate-300 truncate' : ''}>{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-3xl">
            {eyebrow && <Eyebrow className="enter-up">{eyebrow}</Eyebrow>}
            <h1
              className="enter-up mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.02]"
              style={{ '--enter-delay': '80ms' } as React.CSSProperties}
            >
              {title}
            </h1>
            {description && (
              <p
                className="enter-up mt-5 text-base text-slate-400 leading-relaxed max-w-2xl"
                style={{ '--enter-delay': '160ms' } as React.CSSProperties}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="enter-up shrink-0" style={{ '--enter-delay': '220ms' } as React.CSSProperties}>
              {actions}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <dl
            className="enter-up mt-10 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:flex sm:flex-wrap gap-x-12 gap-y-5"
            style={{ '--enter-delay': '260ms' } as React.CSSProperties}
          >
            {stats.map(s => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-mono font-medium tabular-nums text-white">{s.value}</dd>
                <dd className="text-xs text-slate-500 mt-1">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </header>
  );
}
