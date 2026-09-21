/**
 * Test script simulating a Make.com HTTP module posting a new track row from Google Sheets
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const port = process.env.PORT || 3000;
const siteUrl = `http://localhost:${port}`;
const secretKey = process.env.INGESTION_API_KEY || 'b2b_music_dev_key_2026';

const sampleMakePayload = {
  title: "Quantum Frontier",
  targetKeyword: "futuristic tech product announcement music",
  bpm: 126,
  musicalKey: "E Minor",
  genre: "Tech Electronic",
  moods: ["Visionary", "Driving", "Technological"],
  useCases: ["Product Launch", "Keynote Intro", "Hardware Teaser"],
  description: "Futuristic modular synths, analog bass pulse, crisp glitch percussion, and evolving pads. Engineered specifically for hardware tech reveals and high-velocity product announcements.",
  previewAudioUrl: "https://actions.google.com/sounds/v1/science_fiction/deep_drone.ogg",
  coverImageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
  durationSeconds: 155,
  standardPriceCents: 4900,
  broadcastPriceCents: 19900
};

async function testIngest() {
  console.log(`Testing Ingestion API at ${siteUrl}/api/tracks/ingest ...`);
  try {
    const res = await fetch(`${siteUrl}/api/tracks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify(sampleMakePayload)
    });

    const data = await res.json();
    console.log(`Status Code: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log('✅ Ingestion, slug generation, and ISR trigger succeeded!');
    } else {
      console.error('❌ Ingestion failed:', data);
    }
  } catch (err) {
    console.error('Test failed (make sure Next.js dev server is running):', err.message);
  }
}

testIngest();
