'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Track } from '@/lib/db/types';

const PROJECT_STORAGE_KEY = 'b2b.project-bin';

/** Licensed downloads are the full-quality masters. (The MP3 is only the watermarked preview.) */
export type DownloadFormat = 'WAV' | 'AIFF';
export const DOWNLOAD_FORMATS: DownloadFormat[] = ['WAV', 'AIFF'];

interface WorkspaceContextType {
  // Project bin — tracks shortlisted for the current production
  projectIds: number[];
  /** Full records for projectIds, fetched from /api/catalog (in bin order). */
  projectTracks: Track[];
  isInProject: (trackId: number) => boolean;
  toggleProject: (trackId: number) => void;
  // Stems inspector drawer
  stemsTrack: Track | null;
  openStems: (track: Track) => void;
  closeStems: () => void;
  // Mobile navigation drawer
  mobileNavOpen: boolean;
  // Delivery format shared by the dock and stems drawer
  downloadFormat: DownloadFormat;
  setDownloadFormat: (format: DownloadFormat) => void;
  setMobileNavOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [stemsTrack, setStemsTrack] = useState<Track | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('WAV');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
      if (raw) setProjectIds(JSON.parse(raw));
    } catch {
      // Storage unavailable (private mode) — bin stays session-only.
    }
  }, []);

  // Resolve saved ids to tracks. Ids for tracks that were unpublished simply drop out.
  const [projectTracks, setProjectTracks] = useState<Track[]>([]);
  const idsKey = projectIds.join(',');
  useEffect(() => {
    if (!idsKey) {
      setProjectTracks([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/catalog?ids=${idsKey}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { tracks: [] }))
      .then(({ tracks }: { tracks: Track[] }) => {
        const byId = new Map(tracks.map(t => [t.id, t]));
        setProjectTracks(idsKey.split(',').map(Number).map(id => byId.get(id)).filter((t): t is Track => Boolean(t)));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [idsKey]);

  const toggleProject = (trackId: number) => {
    setProjectIds(prev => {
      const next = prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId];
      try {
        window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        projectIds,
        projectTracks,
        isInProject: (trackId) => projectIds.includes(trackId),
        toggleProject,
        stemsTrack,
        openStems: setStemsTrack,
        closeStems: () => setStemsTrack(null),
        mobileNavOpen,
        setMobileNavOpen,
        downloadFormat,
        setDownloadFormat,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
