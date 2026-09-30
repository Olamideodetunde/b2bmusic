'use client';

import React, { useState } from 'react';
import { Download, Loader2, Lock } from 'lucide-react';
import type { Track } from '@/lib/db/types';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import { cn } from '@/lib/utils';
import { useAuth, type MasterFormat } from './AuthContext';

/**
 * The track's download/buy action, driven by the viewer's rights:
 *   subscriber or license holder → an unrestricted "Download" of the master
 *   anyone else                  → the unlock modal (subscribe OR buy this track)
 * so a subscriber is never asked to pay for a track their plan already covers.
 */
export function TrackActionButton({
  track,
  variant = 'icon',
  format,
  className,
}: {
  track: Track;
  variant?: 'icon' | 'button';
  /** Defaults to the format picked in the player dock (WAV / AIFF). */
  format?: MasterFormat;
  className?: string;
}) {
  const { accessFor, openUnlock, download, loading } = useAuth();
  const { downloadFormat } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const fmt: MasterFormat = format ?? (downloadFormat === 'AIFF' ? 'aiff' : 'wav');
  const access = accessFor(track.id);

  const onClick = async () => {
    if (!access) {
      openUnlock(track);
      return;
    }
    setBusy(true);
    try {
      await download(track, fmt);
    } finally {
      setBusy(false);
    }
  };

  const label = access ? `Download ${fmt.toUpperCase()} master of ${track.title}` : `Get ${track.title} — subscribe or buy a license`;

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        disabled={busy || loading}
        className={cn(
          'inline-flex items-center justify-center w-6 h-6 rounded transition-colors disabled:opacity-50',
          access ? 'text-brand-400 hover:text-brand-300 hover:bg-brand-600/10' : 'text-slate-500 hover:text-white hover:bg-white/[0.06]',
          className,
        )}
        title={access ? `Download ${fmt.toUpperCase()}` : 'Download master'}
        aria-label={label}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={busy || loading}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors disabled:opacity-60',
        access ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'border border-white/10 text-slate-200 hover:text-white hover:bg-white/[0.04]',
        className,
      )}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : access ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      {access ? `Download ${fmt.toUpperCase()}` : 'Download'}
    </button>
  );
}
