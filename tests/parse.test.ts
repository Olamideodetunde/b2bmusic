import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrackRow } from '../src/lib/ingest/parse';
import { generateSlug, makeUniqueSlug } from '../src/lib/seo/slugify';
import { parseCsv, toCsv } from '../src/lib/ingest/csv';
import { sampleRows } from './helpers';

test('every row in the client sample sheet validates', async () => {
  const rows = await sampleRows();
  assert.equal(rows.length, 4);
  for (const row of rows) {
    const parsed = parseTrackRow(row);
    assert.deepEqual(parsed.errors, [], `${row.Title}: ${JSON.stringify(parsed.errors)}`);
    assert.equal(parsed.status, 'Ready');
    assert.equal(parsed.trackId, null);
  }
});

test('maps sheet headers and converts units', async () => {
  const [row] = await sampleRows(); // Apex Solar Pulse
  const { input } = parseTrackRow(row);
  assert.ok(input);
  assert.equal(input.title, 'Apex Solar Pulse');
  assert.equal(input.targetKeyword, 'futuristic solar automotive commercial soundtrack');
  assert.equal(input.genre, 'Electronic');
  assert.equal(input.bpm, 128);
  assert.equal(input.musicalKey, 'A Minor');
  assert.equal(input.durationSeconds, 165); // "2:45"
  assert.deepEqual(input.moods, ['Futuristic', 'Confident', 'Driving', 'Tech']);
  assert.deepEqual(input.useCases, ['Automotive Commercials', 'Tech Launch', 'YouTube Promo']);
  assert.equal(input.standardPriceCents, 1000);
  assert.equal(input.commercialPriceCents, 2000);
  assert.equal(input.broadcastPriceCents, 4000);
});

test('accepts camelCase JSON as well as sheet headers', () => {
  const parsed = parseTrackRow({
    title: 'X', targetKeyword: 'upbeat corporate background music', genre: 'corporate / tech', bpm: '120 BPM',
    musicalKey: 'f# min', duration: 150, description: 'x'.repeat(80), moods: ['Calm', 'calm', ' Focused '],
    useCases: 'Explainer', audioUrl: 'https://cdn.example.com/a.mp3',
    standardPrice: '$10.00', commercialPrice: 20, broadcastPrice: '1,250',
  });
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.input!.genre, 'Corporate / Tech'); // canonical spelling
  assert.equal(parsed.input!.musicalKey, 'F# Minor');
  assert.deepEqual(parsed.input!.moods, ['Calm', 'Focused']); // de-duplicated, trimmed
  assert.equal(parsed.input!.broadcastPriceCents, 125_000);
});

test('corrects Google Sheets turning "2:45" into a time of day', () => {
  const base = { Title: 'T', 'Target Keyword': 'kw one', Genre: 'Ambient', BPM: 80, 'Musical Key': 'C Major', Description: 'd'.repeat(80), Moods: 'Calm', 'Use Cases': 'Film', 'Audio URL': '/a.mp3', 'Standard Price': 10, 'Commercial Price': 20, 'Broadcast Price': 40 };
  const asTime = parseTrackRow({ ...base, Duration: '2:45:00' });
  assert.equal(asTime.input!.durationSeconds, 165);
  assert.match(asTime.warnings[0], /Plain text/);
  const asDayFraction = parseTrackRow({ ...base, Duration: 0.11458333 }); // 2h45m as a fraction of a day
  assert.equal(asDayFraction.input!.durationSeconds, 165);
});

test('collects every field error in one pass', () => {
  const parsed = parseTrackRow({ Title: 'Only a title', Genre: 'Polka', BPM: 999, 'Musical Key': 'H Major', 'Audio URL': 'ftp://x', 'Standard Price': 'free' });
  const fields = parsed.errors.map(e => e.field).sort();
  for (const f of ['targetKeyword', 'genre', 'bpm', 'musicalKey', 'duration', 'description', 'moods', 'useCases', 'audioUrl', 'standardPrice', 'commercialPrice', 'broadcastPrice']) {
    assert.ok(fields.includes(f), `expected an error for ${f}`);
  }
  assert.match(parsed.errors.find(e => e.field === 'genre')!.message, /dropdown/);
  assert.equal(parsed.input, null);
});

test('rejects a hand-edited Track ID and an unknown status', () => {
  const parsed = parseTrackRow({ 'Track ID': 'abc', Status: 'Live' });
  assert.ok(parsed.errors.some(e => e.field === 'trackId'));
  assert.ok(parsed.errors.some(e => e.field === 'status'));
});

test('slugs come from the target keyword and never collide', () => {
  assert.equal(generateSlug('Warm Acoustic Folk & Lifestyle Brand Music!'), 'warm-acoustic-folk-and-lifestyle-brand-music');
  assert.equal(generateSlug('  Lo-Fi   hip hop — tech  '), 'lo-fi-hip-hop-tech');
  assert.equal(makeUniqueSlug('a', []), 'a');
  assert.equal(makeUniqueSlug('a', ['a']), 'a-2');
  assert.equal(makeUniqueSlug('a', ['a', 'a-2', 'a-3']), 'a-4');
});

test('CSV round-trips quoted fields', () => {
  const rows = [{ A: 'plain', B: 'has, comma', C: 'has "quotes"\nand newline' }];
  assert.deepEqual(parseCsv(toCsv(rows, ['A', 'B', 'C'])), rows);
});
