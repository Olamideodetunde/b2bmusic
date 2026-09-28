// Test flexible ingestion endpoint locally
async function runTests() {
  const baseUrl = 'http://localhost:3001';
  const apiKey = 'b2b_music_dev_key_2026';

  console.log('Testing GET /api/track-pages...');
  try {
    const resGet = await fetch(`${baseUrl}/api/track-pages`);
    const dataGet = await resGet.json();
    console.log('GET Result:', resGet.status, dataGet.status === 'online' ? 'PASSED' : 'FAILED', dataGet);
  } catch (err) {
    console.log('GET failed (server might be starting):', err.message);
  }

  console.log('\nTesting POST /api/track-pages with Make.com format...');
  const testPayload = {
    title: "Apex Solar Horizon Test",
    targetKeyword: "futuristic solar automotive commercial soundtrack",
    genre: "Electronic",
    bpm: "128 BPM",
    musicalKey: "A Minor",
    duration: "2:45",
    description: "High-energy synth pulse built for EV commercials and tech launches. Features pulsing arpeggios.",
    moods: "Futuristic, Confident, Driving",
    useCases: "Automotive Commercials, Tech Launch",
    audioUrl: "https://b2bmusic.vercel.app/audio/demo.mp3",
    prices: {
      standard: "$10",
      agency: 20,
      broadcast: 40
    }
  };

  try {
    const resPost = await fetch(`${baseUrl}/api/track-pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    const dataPost = await resPost.json();
    console.log('POST Result:', resPost.status, dataPost.success ? 'PASSED' : 'FAILED', dataPost);
  } catch (err) {
    console.log('POST failed:', err.message);
  }
}

runTests();
