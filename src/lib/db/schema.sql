-- B2BProductionMusic.com Database Schema for Neon Serverless Postgres
-- Run this in the Neon SQL Editor or via migration runner

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

-- Indexing for high-speed programmatic lookups & SEO filter hubs
CREATE INDEX IF NOT EXISTS idx_tracks_slug ON tracks(slug);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_published ON tracks(is_published);
