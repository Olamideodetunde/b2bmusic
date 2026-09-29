import { toSlug } from '../utils';

/**
 * Converts a buyer search-intent keyword into a URL slug.
 * "Upbeat Corporate Tech Background Music" → "upbeat-corporate-tech-background-music"
 */
export function generateSlug(text: string): string {
  return toSlug(text).slice(0, 96).replace(/-+$/, '');
}

/**
 * Returns `base`, or the first free `base-2`, `base-3`… given the slugs already in use.
 * Only used when a *new* track's keyword slugifies to an existing slug — updates never
 * change a slug, so live URLs stay stable.
 */
export function makeUniqueSlug(base: string, takenSlugs: string[]): string {
  const taken = new Set(takenSlugs);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
