'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { changeAdminPassword, updateSettings } from '@/server/actions/admin';
import type { SiteSettings } from '@/lib/settings';

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { await updateSettings(fd); setSaved(true); router.refresh(); });
  };

  const text = (name: keyof SiteSettings, label: string, hint?: string) => (
    <div>
      <label className="label">{label}</label>
      <input name={name} defaultValue={settings[name]} className="input" />
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
  const area = (name: keyof SiteSettings, label: string, rows = 3, hint?: string) => (
    <div>
      <label className="label">{label}</label>
      <textarea name={name} rows={rows} defaultValue={settings[name]} className="input resize-y" />
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Business Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('businessName', 'Business Name')}
          {text('tagline', 'Tagline')}
          {text('whatsappNumber', 'WhatsApp Number', 'Digits only with country code, e.g. 919825751614')}
          {text('contactPhone', 'Contact Phone (display)')}
          {text('businessEmail', 'Business Email')}
          {text('businessAddress', 'Business Address')}
          {text('serviceArea', 'Service Area')}
          {text('businessHours', 'Business Hours')}
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Homepage Content</h2>
        {text('heroHeading', 'Hero Heading')}
        {area('heroSubtext', 'Hero Supporting Text', 2)}
        {text('footerNote', 'Trust Message / Footer Note')}
        {area('aboutContent', 'About Us Content', 6, 'Separate paragraphs with a blank line.')}
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Social Links</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {text('socialInstagram', 'Instagram URL')}
          {text('socialFacebook', 'Facebook URL')}
          {text('socialLinkedin', 'LinkedIn URL')}
        </div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Legal Pages</h2>
        {area('privacyPolicy', 'Privacy Policy (leave empty to use the built-in default)', 6)}
        {area('terms', 'Terms and Conditions (leave empty to use the built-in default)', 6)}
      </section>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Settings
        </button>
        {saved && !pending ? <span className="text-sm font-medium text-green-600">Settings saved ✓</span> : null}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await changeAdminPassword(fd);
          setResult(res as never);
          if ((res as { ok: boolean }).ok) form.reset();
        });
      }}
      className="card space-y-4 p-5"
    >
      <h2 className="font-semibold text-navy-900">Change Admin Password</h2>
      {result ? (
        <p className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{result.message}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Current Password</label><input name="current" type="password" autoComplete="current-password" className="input" required /></div>
        <div><label className="label">New Password (10+ chars)</label><input name="next" type="password" autoComplete="new-password" className="input" required minLength={10} /></div>
      </div>
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Update Password
      </button>
    </form>
  );
}
