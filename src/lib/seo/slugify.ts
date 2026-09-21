/**
 * Cleans and converts search-intent keywords and track titles into URL-safe slugs
 * Example: "Upbeat Corporate Tech Background Music" -> "upbeat-corporate-tech-background-music"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, '-') // convert spaces and underscores to hyphens
    .replace(/^-+|-+$/g, ''); // trim leading and trailing hyphens
}

/**
 * Ensures slug uniqueness by checking existing database slugs and appending an increment if needed
 */
export function makeUniqueSlug(candidate: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(candidate);
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}
