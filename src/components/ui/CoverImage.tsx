import React from 'react';
import Image from 'next/image';
import { canOptimize } from '@/lib/images';

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Load eagerly with high priority — only for the above-the-fold (LCP) image. */
  priority?: boolean;
  /** Next.js `sizes` hint. Defaults to 100vw for fill; omitted for fixed-size images. */
  sizes?: string;
  quality?: number;
} & ({ fill: true; size?: never } | { fill?: false; size: number });

/**
 * Optimized image for covers, thumbnails and backdrops. Local and allow-listed images
 * use next/image; anything else (an unexpected host from the sheet) falls back to a
 * plain <img> with the same sizing and lazy loading, so it can never break a page.
 */
export function CoverImage({ src, alt, className, priority, sizes, quality, ...rest }: Props) {
  const fill = rest.fill === true;
  const size = fill ? undefined : rest.size;

  if (canOptimize(src)) {
    return fill ? (
      <Image src={src} alt={alt} fill sizes={sizes ?? '100vw'} priority={priority} quality={quality} className={className} />
    ) : (
      // No `sizes` for fixed images: next/image then emits a tight 1x/2x srcset (e.g. 48w/96w
      // for a 36px thumbnail) instead of every breakpoint up to 3840w.
      <Image src={src} alt={alt} width={size} height={size} sizes={sizes} priority={priority} quality={quality} className={className} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={fill ? `absolute inset-0 w-full h-full ${className ?? ''}` : className}
    />
  );
}
