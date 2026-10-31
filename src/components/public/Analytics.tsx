'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SID_KEY = 'cs_sid';
const CONSENT_KEY = 'cs_consent';

function getSid() {
  if (typeof window === 'undefined') return null;
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export function track(type: string, meta?: Record<string, unknown>) {
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'declined') return;
    const payload = JSON.stringify({
      sid: getSid(),
      type,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      consent: consent === 'accepted',
      meta,
    });
    navigator.sendBeacon?.('/api/track', new Blob([payload], { type: 'application/json' })) ||
      fetch('/api/track', { method: 'POST', body: payload, keepalive: true });
  } catch { /* never break the page for analytics */ }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    track('page_view');
    if (pathname === '/contact') track('contact_view');
  }, [pathname]);
  return null;
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);
  const choose = useCallback((v: 'accepted' | 'declined') => {
    localStorage.setItem(CONSENT_KEY, v);
    setVisible(false);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="container-site">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            We use anonymous, first-party analytics to understand how students use this website.
            No personal details are collected unless you submit a form.{' '}
            <a href="/privacy-policy" className="font-medium text-royal-600 underline">Privacy Policy</a>
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => choose('declined')} className="btn-outline btn-sm">Decline</button>
            <button onClick={() => choose('accepted')} className="btn-royal btn-sm">Accept</button>
          </div>
        </div>
      </div>
    </div>
  );
}
