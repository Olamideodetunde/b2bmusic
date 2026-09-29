import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

type Tone = 'onDark' | 'onLight';

/**
 * The GlobalB2BAudioHolding waveform + play mark, redrawn as vector from the master logo
 * so it stays sharp at any size. `onLight` matches the original artwork (navy left bars);
 * `onDark` is the reversed version for navy surfaces — the navy ink becomes near-white.
 */
export function LogoMark({ tone = 'onDark', className, title }: { tone?: Tone; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${uid}`;
  const inkLeft =
    tone === 'onLight'
      ? [['0', '#005ab8'], ['0.19', '#0b468c'], ['0.35', '#0f2d51'], ['0.52', '#112138'], ['1', '#112138']]
      : [['0', '#2a7bff'], ['0.2', '#5a9bff'], ['0.4', '#bcd6ff'], ['0.55', '#eef3fa'], ['1', '#eef3fa']];

  return (
    <svg
      viewBox="380 198 668 424"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={id('l')} gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="620">
          {inkLeft.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={id('r')} gradientUnits="userSpaceOnUse" x1="0" y1="240" x2="0" y2="590">
          <stop offset="0" stopColor="#0670ff" />
          <stop offset="0.26" stopColor="#096aec" />
          <stop offset="0.77" stopColor={tone === 'onLight' ? '#0e4588' : '#0b52b8'} />
          <stop offset="1" stopColor={tone === 'onLight' ? '#0e4588' : '#0b52b8'} />
        </linearGradient>
        <linearGradient id={id('p')} gradientUnits="userSpaceOnUse" x1="634" y1="300" x2="780" y2="520">
          <stop offset="0" stopColor="#0d3a78" />
          <stop offset="1" stopColor="#0f2442" />
        </linearGradient>
        <linearGradient id={id('g')} gradientUnits="userSpaceOnUse" x1="634" y1="0" x2="826" y2="0">
          <stop offset="0" stopColor="#8a6a2e" stopOpacity={tone === 'onLight' ? 0.35 : 0.8} />
          <stop offset="0.45" stopColor="#cfa044" />
          <stop offset="0.8" stopColor="#f0cd6c" />
          <stop offset="1" stopColor="#f5df9f" />
        </linearGradient>
        {/* Knock the play-button silhouette out of the first right-hand bar, as in the artwork */}
        <mask id={id('m')} maskUnits="userSpaceOnUse" x="380" y="198" width="668" height="424">
          <rect x="380" y="198" width="668" height="424" fill="#fff" />
          <path d="M636 302 L822 418 L636 534 Z" fill="#000" stroke="#000" strokeWidth="34" strokeLinejoin="round" />
        </mask>
      </defs>

      <g fill={`url(#${id('l')})`}>
        <rect x="388" y="388" width="38" height="75" rx="19" />
        <rect x="442" y="344" width="46" height="155" rx="23" />
        <rect x="504" y="278" width="46" height="273" rx="23" />
        <rect x="566" y="206" width="46" height="409" rx="23" />
      </g>

      <g fill={`url(#${id('r')})`}>
        <rect x="810" y="297" width="46" height="244" rx="23" mask={`url(#${id('m')})`} />
        <rect x="872" y="239" width="46" height="349" rx="23" />
        <rect x="934" y="317" width="46" height="195" rx="23" />
        <rect x="997" y="376" width="41" height="90" rx="20.5" />
      </g>

      <path
        d="M636 302 L822 418 L636 534 Z"
        fill={`url(#${id('p')})`}
        stroke={`url(#${id('g')})`}
        strokeWidth="9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full lockup: mark + "GlobalB2BAudioHolding.com" wordmark (+ optional tagline).
 * The wordmark is live text in the brand face (Montserrat) so it's crisp, selectable
 * and readable by search engines.
 */
export function Logo({
  tone = 'onDark',
  tagline = true,
  size = 'md',
  className,
}: {
  tone?: Tone;
  tagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const ink = tone === 'onLight' ? 'text-[#102038]' : 'text-white';
  const blue = tone === 'onLight' ? 'text-brand-600' : 'text-brand-500';
  const sizes = {
    sm: { mark: 'h-7', word: 'text-[13px]', tag: 'text-[8px] tracking-[0.28em]' },
    md: { mark: 'h-8 sm:h-9', word: 'text-[13px] sm:text-[15px]', tag: 'text-[8px] sm:text-[9px] tracking-[0.3em]' },
    lg: { mark: 'h-14', word: 'text-2xl', tag: 'text-[11px] tracking-[0.34em]' },
  }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark tone={tone} className={cn('w-auto shrink-0', sizes.mark)} />
      <span className="flex flex-col min-w-0">
        <span className={cn('font-brand font-bold tracking-[-0.02em] leading-none whitespace-nowrap', ink, sizes.word)}>
          Global<span className={blue}>B2B</span>AudioHolding<span className="text-gold-500">.com</span>
        </span>
        {tagline && (
          <span
            className={cn(
              'font-brand font-medium leading-none mt-1.5 whitespace-nowrap',
              tone === 'onLight' ? 'text-[#102038]/80' : 'text-slate-400',
              sizes.tag,
            )}
          >
            {BRAND.tagline.split('•').map((part, i, all) => (
              <React.Fragment key={part}>
                {part.trim()}
                {i < all.length - 1 && <span className="text-gold-500 mx-1.5" aria-hidden>•</span>}
              </React.Fragment>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
