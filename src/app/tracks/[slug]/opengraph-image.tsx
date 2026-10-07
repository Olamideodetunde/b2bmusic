import { promises as fs } from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import { getTrackBySlug } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { formatPrice, parseMusicalKey, titleCase } from '@/lib/utils';

/**
 * A 1200×630 share card per track (Open Graph + Twitter), so links posted to Slack,
 * LinkedIn, X or iMessage show a branded preview instead of an arbitrarily cropped cover.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Track preview';

/** Inline the cover as a data URI: site images are read from /public, remote ones fetched. */
async function coverDataUri(src?: string): Promise<string | null> {
  if (!src) return null;
  try {
    if (src.startsWith('/') && !src.startsWith('//')) {
      const file = path.join(process.cwd(), 'public', path.normalize(src).replace(/^([/\\])+/, ''));
      if (!file.startsWith(path.join(process.cwd(), 'public'))) return null;
      const ext = path.extname(file).toLowerCase() === '.png' ? 'png' : 'jpeg';
      return `data:image/${ext};base64,${(await fs.readFile(file)).toString('base64')}`;
    }
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null; // the renderer handles PNG/JPEG only
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function TrackOgImage({ params }: { params: { slug: string } }) {
  const track = await getTrackBySlug(params.slug);
  const cover = await coverDataUri(track?.coverImageUrl);
  const title = track?.title ?? BRAND.name;
  const keyword = track?.targetKeyword ? titleCase(track.targetKeyword) : 'Production Music & Sync Licensing';
  const key = track ? parseMusicalKey(track.musicalKey) : null;
  const specs = track ? [`${track.bpm} BPM`, key?.camelot ? `${track.musicalKey} · ${key.camelot}` : track.musicalKey, track.genre] : [];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', padding: 64, gap: 56, alignItems: 'center',
        background: 'linear-gradient(135deg, #050b17 0%, #0f1e36 60%, #0e2449 100%)', color: '#ffffff', fontFamily: 'sans-serif' }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={420} height={420} style={{ width: 420, height: 420, objectFit: 'cover', borderRadius: 28, border: '2px solid rgba(255,255,255,0.15)' }} />
        ) : (
          <div style={{ width: 420, height: 420, borderRadius: 28, background: '#0a64f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>♪</div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 24, color: '#9fb1cf' }}>
            Global<span style={{ color: '#2a7bff' }}>B2B</span>AudioHolding<span style={{ color: '#cfa044' }}>.com</span>
          </div>
          <div style={{ fontSize: title.length > 22 ? 58 : 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ fontSize: 30, color: '#bcd6ff', lineHeight: 1.2 }}>{keyword}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {specs.map(s => (
              <div key={s} style={{ display: 'flex', fontSize: 22, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>{s}</div>
            ))}
          </div>
          {track && (
            <div style={{ display: 'flex', marginTop: 18, fontSize: 24, color: '#cfa044' }}>
              Pre-cleared sync license · from {formatPrice(track.standardPriceCents)}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
