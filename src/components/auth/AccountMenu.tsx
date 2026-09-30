'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Infinity as InfinityIcon, LogOut, User as UserIcon } from 'lucide-react';
import { formatPlan } from '@/lib/plan';
import { useAuth } from './AuthContext';

function renewalLine(sub: { currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null): string | null {
  if (!sub?.currentPeriodEnd) return null;
  const date = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return sub.cancelAtPeriodEnd ? `Ends ${date}` : `Renews ${date}`;
}

/** "Sign in" for visitors; an account menu (plan status, billing, sign out) once signed in. */
export function AccountMenu() {
  const { me, loading, openSignIn, signOut, subscribe, openBillingPortal } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading) return <span className="inline-block w-8 h-8" aria-hidden />;

  if (!me.user) {
    return (
      <button
        onClick={openSignIn}
        className="inline-flex items-center gap-1.5 whitespace-nowrap h-8 px-3 rounded-full border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-200 hover:text-white hover:border-white/25 transition-colors"
      >
        <UserIcon className="w-3.5 h-3.5" />
        Sign in
      </button>
    );
  }

  const initial = me.user.email[0]?.toUpperCase() ?? '?';
  const item = 'flex items-center gap-2 w-full h-8 px-3 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white text-left';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="relative w-8 h-8 inline-flex items-center justify-center rounded-full bg-brand-600/20 border border-brand-500/40 text-xs font-bold text-white"
      >
        {initial}
        {me.isSubscribed && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gold-500 border-2 border-navy-950" title="All-access subscriber" />}
      </button>
      {open && (
        <div role="menu" className={`absolute right-0 top-full mt-2 w-64 rounded-md bg-navy-850 border border-white/10 shadow-xl shadow-black/60 py-1`}>
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <div className="text-xs text-white truncate">{me.user.email}</div>
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              {me.isSubscribed ? (
                <span className="text-gold-400">All-access · {renewalLine(me.subscription) ?? 'active'}</span>
              ) : me.purchasedTrackIds.length > 0 ? (
                `${me.purchasedTrackIds.length} licensed ${me.purchasedTrackIds.length === 1 ? 'track' : 'tracks'}`
              ) : (
                'No subscription'
              )}
            </div>
          </div>
          <Link href="/account" onClick={() => setOpen(false)} className={item} role="menuitem">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" /> My downloads &amp; licenses
          </Link>
          {!me.isSubscribed && me.plan && (
            <button onClick={() => { setOpen(false); subscribe(); }} className={item} role="menuitem">
              <InfinityIcon className="w-3.5 h-3.5 text-brand-400" /> Unlock everything · {formatPlan(me.plan)}
            </button>
          )}
          {(me.subscription || me.purchasedTrackIds.length > 0) && (
            <button onClick={() => { setOpen(false); openBillingPortal(); }} className={item} role="menuitem">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Billing &amp; invoices
            </button>
          )}
          <div className="my-1 border-t border-white/[0.06]" />
          <button onClick={() => { setOpen(false); signOut(); }} className={item} role="menuitem">
            <LogOut className="w-3.5 h-3.5 text-slate-500" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
