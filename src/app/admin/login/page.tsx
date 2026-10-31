import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/shared/Logo';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Admin Login', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (getSession()) redirect('/admin');
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo name={settings.businessName} tagline="Admin Dashboard" light />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-navy-950">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Restricted area — administrators only.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-navy-400">
          Protected by rate limiting and account lockout.
        </p>
      </div>
    </div>
  );
}
