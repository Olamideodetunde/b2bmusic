// The same branded card is used for X/Twitter previews. Route config must be declared
// literally here (Next.js reads it statically), so only the image function is re-used.
export { default } from './opengraph-image';

export const runtime = 'nodejs';
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Track preview';
