import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, titleCase, absoluteUrl, isIndexable } from '../src/lib/utils';

test('excerpt keeps short text intact and only adds an ellipsis when it cuts', () => {
  assert.equal(excerpt('Warm acoustic guitars.', 100), 'Warm acoustic guitars.');
  const long = 'High-energy analog synth pulse built for EV commercials and tech launches with punchy low end';
  const cut = excerpt(long, 60);
  assert.ok(cut.length <= 60, `too long: ${cut.length}`);
  assert.ok(cut.endsWith('…'));
  assert.ok(!/\s…$/.test(cut), 'cuts on a word boundary without trailing space');
});

test('excerpt strips description markup into plain text', () => {
  const rich = '**Driving** synth bed.\n\n- Logo sting\n- 30s cutdown';
  assert.equal(excerpt(rich, 200), 'Driving synth bed. Logo sting 30s cutdown');
});

test('titleCase capitalises keyword words without lowering existing capitals', () => {
  assert.equal(titleCase('upbeat corporate tech music'), 'Upbeat Corporate Tech Music');
  assert.equal(titleCase('SaaS explainer music'), 'SaaS Explainer Music');
});

test('absoluteUrl resolves site-relative assets for schema.org and Stripe', () => {
  assert.equal(absoluteUrl('/audio/x.mp3', 'https://example.com'), 'https://example.com/audio/x.mp3');
  assert.equal(absoluteUrl('audio/x.mp3', 'https://example.com'), 'https://example.com/audio/x.mp3');
  assert.equal(absoluteUrl('https://cdn.example.net/x.mp3', 'https://example.com'), 'https://cdn.example.net/x.mp3');
});

test('only production deployments are indexable', () => {
  const saved = { VERCEL_ENV: process.env.VERCEL_ENV, NOINDEX: process.env.NOINDEX };
  try {
    delete process.env.NOINDEX;
    process.env.VERCEL_ENV = 'preview';
    assert.equal(isIndexable(), false);
    process.env.VERCEL_ENV = 'production';
    assert.equal(isIndexable(), true);
    process.env.NOINDEX = 'true';
    assert.equal(isIndexable(), false);
    delete process.env.VERCEL_ENV;
    delete process.env.NOINDEX;
    assert.equal(isIndexable(), true);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('ISO 8601 durations for MusicRecording / AudioObject', async () => {
  const { isoDuration } = await import('../src/components/track/SchemaJsonLd');
  assert.equal(isoDuration(110), 'PT1M50S');
  assert.equal(isoDuration(120), 'PT2M');
  assert.equal(isoDuration(45), 'PT45S');
  assert.equal(isoDuration(0), 'PT0S');
});

test('every page gets a complete social card with a default image', async () => {
  const { socialMeta, SITE_TITLE, SITE_DESCRIPTION } = await import('../src/lib/seo/meta');
  assert.ok(SITE_TITLE.length <= 60, `site title is ${SITE_TITLE.length} chars`);
  assert.ok(SITE_DESCRIPTION.length <= 155, `site description is ${SITE_DESCRIPTION.length} chars`);
  const m = socialMeta({ title: 'Genres', description: 'd', url: '/genres' });
  const og = m.openGraph as any;
  assert.match(og.url, /^https?:\/\/.+\/genres$/);
  assert.match(og.images[0].url, /\/brand\/og-default\.jpg$/);
  assert.equal(og.images[0].width, 1200);
  assert.ok(og.siteName);
  assert.equal((m.twitter as any).card, 'summary_large_image');
});
