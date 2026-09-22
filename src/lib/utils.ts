import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Returns a guaranteed valid, normalized absolute site URL (e.g. https://b2bmusic.vercel.app).
 * Prevents ERR_INVALID_URL when NEXT_PUBLIC_SITE_URL is set to localhost without protocol or domain without https.
 */
export function getSiteUrl(): string {
  let raw = process.env.NEXT_PUBLIC_SITE_URL;

  // Fallback to Vercel system environment variables if available
  if (!raw && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    raw = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (!raw && process.env.VERCEL_URL) {
    raw = `https://${process.env.VERCEL_URL}`;
  }

  if (!raw) {
    raw = 'https://b2bproductionmusic.com';
  }

  raw = raw.trim();

  // If localhost without protocol, prepend http://
  if (/^localhost(:\d+)?$/i.test(raw) || raw.startsWith('localhost:')) {
    raw = `http://${raw}`;
  } else if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return 'https://b2bproductionmusic.com';
  }
}
