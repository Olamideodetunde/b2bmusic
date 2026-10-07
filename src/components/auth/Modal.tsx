'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Minimal accessible dialog: Escape and backdrop close it, focus moves in and is restored after. */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Callers pass inline arrows; keeping the latest in a ref means a parent re-render
  // (a toast, a refresh) doesn't re-run the effect and yank focus mid-typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panel.current) {
        // Keep Tab inside the dialog.
        const focusable = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The panel is already in the DOM when this effect runs. A selector list matches in DOM
    // order (the Close button would always win), so look up in priority order.
    const p = panel.current;
    (p?.querySelector<HTMLElement>('[data-autofocus]:not([disabled])') ?? p?.querySelector<HTMLElement>('input') ?? p?.querySelector<HTMLElement>('button'))?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-navy-900 shadow-2xl shadow-black/60 ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
