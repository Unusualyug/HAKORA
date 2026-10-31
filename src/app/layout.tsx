import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.businessName} — ${s.tagline}`, template: `%s | ${s.businessName}` },
    description:
      'Academic document assistance, printing, spiral binding, bulk printing and doorstep delivery for school and college students.',
    openGraph: {
      title: `${s.businessName} — ${s.tagline}`,
      description:
        'Academic document assistance, printing, spiral binding, bulk printing and doorstep delivery for students.',
      type: 'website',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
