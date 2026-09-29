'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared page gutter for landing sections. */
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}

/** Small mono section label with a crimson rule. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400', className)}>
      <span className="w-6 h-px bg-crimson-500" />
      {children}
    </div>
  );
}

/** Fades + lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already on screen at mount (above the fold, or restored scroll): show now
    // rather than waiting on an observer callback that throttled tabs may delay.
    const rect = el.getBoundingClientRect();
    if (!('IntersectionObserver' in window) || (rect.top < window.innerHeight && rect.bottom > 0)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      // threshold 0: fire as soon as any part is on screen — a ratio threshold can
      // leave tall blocks (the rights matrix, the catalog) hidden on short viewports.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      className={cn('reveal', className)}
    >
      {children}
    </div>
  );
}

const btnBase =
  'group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-semibold transition-colors duration-300';

export function PrimaryButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(btnBase, 'bg-crimson-600 hover:bg-crimson-500 text-white', className)}>
      {children}
      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

export function GhostButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(btnBase, 'border border-white/15 hover:border-white/40 text-zinc-100 hover:text-white bg-white/[0.02]', className)}
    >
      {children}
    </Link>
  );
}

/** Text link with an underline that draws in on hover. */
export function ArrowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white transition-colors', className)}>
      <span className="relative">
        {children}
        <span className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-crimson-500 transition-transform duration-500 ease-out group-hover:scale-x-100" />
      </span>
      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Section heading pair used across the landing page. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-16">
      <Reveal className="max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.04]">{title}</h2>
        {description && <p className="mt-5 text-base text-zinc-400 leading-relaxed max-w-xl">{description}</p>}
      </Reveal>
      {aside && <Reveal delay={120} className="shrink-0">{aside}</Reveal>}
    </div>
  );
}
