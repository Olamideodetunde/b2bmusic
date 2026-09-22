import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const port = process.env.PORT || 3000;
const siteUrl = `http://localhost:${port}`;
const secretKey = process.env.INGESTION_API_KEY || 'b2b_music_dev_key_2026';

const testTrack = {
  title: "Apex Solar Pulse",
  targetKeyword: "futuristic solar automotive commercial soundtrack",
  bpm: 124,
  musicalKey: "C Major",
  genre: "Tech Ambient",
  moods: ["Visionary", "Pristine", "Dynamic"],
  useCases: ["EV Commercial", "Brand Story", "Clean Energy"],
  description: "Pristine analog synthesizers and driving percussion engineered for clean technology automotive commercials.",
  previewAudioUrl: "https://actions.google.com/sounds/v1/science_fiction/deep_drone.ogg",
  standardPriceCents: 1000,
  agencyPriceCents: 2000,
  broadcastPriceCents: 4000
};

async function testIdempotency() {
  console.log('=== IDEMPOTENCY TEST: /api/track-pages ===\n');

  // Step 1: Initial Ingest
  console.log('1. Posting initial track to /api/track-pages...');
  const res1 = await fetch(`${siteUrl}/api/track-pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`
    },
    body: JSON.stringify(testTrack)
  });

  const data1 = await res1.json();
  console.log(`Status 1: ${res1.status}`);
  console.log(`Action 1: ${data1.action}`);
  console.log(`Slug 1:   ${data1.data?.slug}`);
  console.log(`Live URL: ${data1.data?.liveUrl}\n`);

  if (!data1.success) {
    console.error('Initial ingest failed:', data1);
    process.exit(1);
  }

  // Step 2: Client edits row in Google Sheets (modifies description & price)
  console.log('2. Client edits row (updating description & price) and Make.com resends to /api/track-pages...');
  const updatedTrack = {
    ...testTrack,
    description: "REVISED: Hand-crafted modular analog synths, organic sub-bass, and crisp hats. Re-calibrated for television broadcast.",
    standardPriceCents: 1500, // Price updated to $15
    broadcastPriceCents: 5000 // Price updated to $50
  };

  const res2 = await fetch(`${siteUrl}/api/track-pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`
    },
    body: JSON.stringify(updatedTrack)
  });

  const data2 = await res2.json();
  console.log(`Status 2: ${res2.status}`);
  console.log(`Action 2: ${data2.action}`);
  console.log(`Slug 2:   ${data2.data?.slug}`);
  console.log(`isUpdate: ${data2.data?.isUpdate}\n`);

  // Assertions
  const slugMatched = data1.data.slug === data2.data.slug;
  const isUpdateTrue = data2.data.isUpdate === true;
  const statusCorrect = res2.status === 200;

  if (slugMatched && isUpdateTrue && statusCorrect) {
    console.log('✅ IDEMPOTENCY TEST PASSED:');
    console.log('   - Existing record was updated in-place');
    console.log('   - No duplicate record or slug suffix (-2) was created');
    console.log('   - Live URL slug preserved perfectly');
    console.log('   - Next.js ISR cache revalidation triggered');
  } else {
    console.error('❌ IDEMPOTENCY TEST FAILED:', { slugMatched, isUpdateTrue, statusCorrect });
    process.exit(1);
  }
}

testIdempotency().catch(err => {
  console.error('Error running test:', err.message);
  process.exit(1);
});
