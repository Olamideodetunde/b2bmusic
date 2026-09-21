import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllTracks, getTracksByGenre } from '@/lib/db';
import { TrackCard } from '@/components/hub/TrackCard';
import Link from 'next/link';
import { Music2, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface GenrePageProps {
  params: { genre: string };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const tracks = await getAllTracks();
  const uniqueGenres = Array.from(new Set(tracks.map(t => t.genre.toLowerCase().replace(/\s+/g, '-'))));
  return uniqueGenres.map(genre => ({ genre }));
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const genreTitle = params.genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${genreTitle} Production Music | Commercial Licensing Library`,
    description: `Explore and license royalty-free ${genreTitle} commercial background music. Direct sync licenses, instant download, and YouTube Content ID clearance.`,
  };
}

export default async function GenreHubPage({ params }: GenrePageProps) {
  const tracks = await getTracksByGenre(params.genre);
  const genreTitle = params.genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (tracks.length === 0) notFound();

  return (
    <div className="w-full max-w-[1700px] mx-auto py-10 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 min-h-screen text-white relative">
      {/* Background ambient glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-crimson-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400 mb-6 font-mono">
        <Link href="/" className="hover:text-crimson-400 transition-colors">Catalog</Link>
        <ChevronRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-200 font-semibold">{genreTitle}</span>
      </nav>

      {/* Hub Hero */}
      <div className="glass-panel border border-white/10 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-crimson-950/60 text-crimson-300 border border-crimson-800/60 mb-3 shadow-sm">
            <Music2 className="w-3.5 h-3.5 text-crimson-400" />
            <span>Genre Hub</span>
          </div>
          <h1 className="font-syne text-3xl sm:text-4xl font-black text-white tracking-tight">
            {genreTitle} Commercial Music
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed font-jakarta">
            Broadcast-quality {genreTitle.toLowerCase()} tracks formatted for commercial campaigns, streaming video, corporate brand films, and tech presentations.
          </p>
          <div className="flex items-center gap-3 mt-6 text-xs font-mono">
            <span className="bg-white/5 text-zinc-300 px-3 py-1.5 rounded-xl border border-white/10 font-semibold">
              {tracks.length} {tracks.length === 1 ? 'Track' : 'Tracks'} Available
            </span>
            <span className="bg-crimson-950/50 text-crimson-300 px-3 py-1.5 rounded-xl border border-crimson-800/60 font-bold">
              from $10 / track
            </span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2 className="font-syne text-lg font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-crimson-400" />
            <span>Available Tracks</span>
          </h2>
          <span className="text-xs font-mono text-zinc-400">Audio Preview &amp; Stems Included</span>
        </div>
        {tracks.map(track => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}
