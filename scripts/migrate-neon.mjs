import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_UWYDd1TAgc6X@ep-ancient-meadow-b5bmppe2-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

async function main() {
  console.log('Connecting to Neon Serverless Postgres...');
  
  // 1. Create table and indexes
  await sql`
    CREATE TABLE IF NOT EXISTS tracks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      target_keyword VARCHAR(255) NOT NULL,
      bpm INTEGER NOT NULL,
      musical_key VARCHAR(50) NOT NULL,
      genre VARCHAR(100) NOT NULL,
      moods JSONB DEFAULT '[]'::jsonb,
      use_cases JSONB DEFAULT '[]'::jsonb,
      description TEXT NOT NULL,
      preview_audio_url TEXT NOT NULL,
      full_audio_url TEXT,
      cover_image_url TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 120,
      standard_price_cents INTEGER NOT NULL DEFAULT 1000,
      agency_price_cents INTEGER NOT NULL DEFAULT 2000,
      broadcast_price_cents INTEGER NOT NULL DEFAULT 4000,
      stripe_product_id VARCHAR(255),
      alt_mixes JSONB DEFAULT '[]'::jsonb,
      stems JSONB DEFAULT '[]'::jsonb,
      sync_meta JSONB DEFAULT '{}'::jsonb,
      is_published BOOLEAN DEFAULT true,
      published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('✓ Table "tracks" created / verified.');

  await sql`CREATE INDEX IF NOT EXISTS idx_tracks_slug ON tracks(slug);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tracks_published ON tracks(is_published);`;
  console.log('✓ Indexes created / verified.');

  // 2. Check existing count
  const countResult = await sql`SELECT count(*) as total FROM tracks;`;
  console.log('Current track count in Neon:', countResult[0].total);

  // 3. If empty, seed initial tracks
  if (parseInt(countResult[0].total) === 0) {
    console.log('Seeding initial master tracks into Neon Postgres...');
    
    const tracksToSeed = [
      {
        title: "Aura of Silicon",
        slug: "corporate-tech-innovation-background-music",
        target_keyword: "corporate tech innovation background music",
        bpm: 122,
        musical_key: "D Major",
        genre: "Tech Ambient",
        moods: ["Inspiring", "Futuristic", "Confident", "Innovative"],
        use_cases: ["SaaS Product Reveal", "Keynote Presentation", "Fintech Commercial"],
        description: "A meticulously calibrated electronic underscore engineered for technology product reveals and keynote announcements. Powered by analog Prophet-6 arpeggios, warm sub-bass, and pristine acoustic transient layers. Calibrated with high mid-range clarity so voiceover narration remains front and center.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        cover_image_url: "/banners/banner-dj-producer.jpg",
        duration_seconds: 145,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      },
      {
        title: "Apex Drive",
        slug: "energetic-commercial-advertisement-music",
        target_keyword: "energetic commercial advertisement music",
        bpm: 128,
        musical_key: "A Minor",
        genre: "Commercial Pop",
        moods: ["High Energy", "Punchy", "Modern", "Youthful"],
        use_cases: ["TV Commercial", "Sports Brand Promo", "Social Ad Campaign"],
        description: "Driving commercial anthem featuring punchy 808 percussion, infectious guitar chops, and soaring modern synthesizer hooks. Built for fast-paced video edits, product launches, and commercial spots that demand immediate viewer retention.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
        cover_image_url: "/banners/banner-spark-energy.jpg",
        duration_seconds: 132,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      },
      {
        title: "Heritage Road",
        slug: "acoustic-folk-lifestyle-brand-music",
        target_keyword: "acoustic folk lifestyle brand music",
        bpm: 98,
        musical_key: "G Major",
        genre: "Acoustic Folk",
        moods: ["Warm", "Authentic", "Heartfelt", "Nostalgic"],
        use_cases: ["Brand Storytelling", "Hospitality Promo", "Eco Product Campaign"],
        description: "Organic, handcrafted acoustic production featuring fingerpicked acoustic guitars, gentle upright bass, and subtle percussion. Ideal for lifestyle branding, documentary narratives, and artisan product storytelling.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
        cover_image_url: "/banners/banner-crowd-amber.jpg",
        duration_seconds: 160,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      },
      {
        title: "Ascent of Kings",
        slug: "cinematic-documentary-ambient-music",
        target_keyword: "cinematic documentary ambient music",
        bpm: 96,
        musical_key: "C Minor",
        genre: "Cinematic Hybrid",
        moods: ["Dramatic", "Epic", "Building", "Cinematic"],
        use_cases: ["Documentary Feature", "Theatrical Trailer", "Nature Film"],
        description: "Monumental cinematic hybrid score combining live string quartet textures, brooding brass horns, and thunderous taiko percussion. Scales from delicate emotional tension to an explosive, awe-inspiring climax.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3",
        cover_image_url: "/banners/banner-fireworks-magenta.jpg",
        duration_seconds: 175,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      },
      {
        title: "Silicon Sunset",
        slug: "lo-fi-tech-podcast-intro-music",
        target_keyword: "lo-fi tech podcast intro music",
        bpm: 86,
        musical_key: "F Major",
        genre: "Tech Lo-Fi",
        moods: ["Chill", "Relaxed", "Intellectual", "Mellow"],
        use_cases: ["Podcast Intro & Outro", "YouTube Tech Review", "Coding Stream"],
        description: "Dusty vinyl crackle, warm Rhodes chords, and laid-back boom-bap percussion designed specifically for tech podcasts, creator videos, and modern explainer content. Non-intrusive and voiceover safe.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2022/04/27/audio_67bcf729cf.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2022/04/27/audio_67bcf729cf.mp3",
        cover_image_url: "/banners/banner-stage-lights.jpg",
        duration_seconds: 110,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      },
      {
        title: "Glass & Steel",
        slug: "modern-minimalist-architecture-piano",
        target_keyword: "modern minimalist architecture piano",
        bpm: 105,
        musical_key: "E Minor",
        genre: "Minimalist Modern",
        moods: ["Sleek", "Elegant", "Clean", "Sophisticated"],
        use_cases: ["Luxury Real Estate", "Architecture Showcase", "Automotive Design"],
        description: "Intimate felt piano arpeggios woven with pristine sub-bass pulses and minimalist electronic design. Calibrated for luxury real estate walkthroughs, design monographs, and architectural showcases.",
        preview_audio_url: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d0c6ff1bab.mp3",
        full_audio_url: "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d0c6ff1bab.mp3",
        cover_image_url: "/banners/banner-dj-producer.jpg",
        duration_seconds: 138,
        standard_price_cents: 1000,
        agency_price_cents: 2000,
        broadcast_price_cents: 4000
      }
    ];

    for (const t of tracksToSeed) {
      await sql`
        INSERT INTO tracks (
          title, slug, target_keyword, bpm, musical_key, genre, moods, use_cases,
          description, preview_audio_url, full_audio_url, cover_image_url,
          duration_seconds, standard_price_cents, agency_price_cents, broadcast_price_cents
        ) VALUES (
          ${t.title}, ${t.slug}, ${t.target_keyword}, ${t.bpm}, ${t.musical_key}, ${t.genre},
          ${JSON.stringify(t.moods)}, ${JSON.stringify(t.use_cases)}, ${t.description},
          ${t.preview_audio_url}, ${t.full_audio_url}, ${t.cover_image_url},
          ${t.duration_seconds}, ${t.standard_price_cents}, ${t.agency_price_cents}, ${t.broadcast_price_cents}
        )
        ON CONFLICT (slug) DO NOTHING;
      `;
    }
    console.log('✓ Seeded 6 tracks into Neon Postgres.');
  }

  const finalCheck = await sql`SELECT id, title, slug, standard_price_cents FROM tracks ORDER BY id ASC;`;
  console.log('✓ Neon Database is verified and live! Records:');
  console.table(finalCheck);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
