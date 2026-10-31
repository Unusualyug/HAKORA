import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { waLink } from '@/lib/whatsapp';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';

export const metadata: Metadata = { title: 'Requirement Submitted', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ThankYouPage({ searchParams }: { searchParams: { ref?: string } }) {
  const settings = await getSettings();
  const ref = searchParams.ref;
  const waHref = waLink(
    settings.whatsappNumber,
    ref
      ? `Hello ${settings.businessName}, I just submitted enquiry ${ref}. I'd like to discuss it.`
      : `Hello ${settings.businessName}, I just submitted an enquiry on your website.`,
  );
  return (
    <div className="container-site flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-9 w-9 text-green-600" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold text-navy-950">Your requirement has been submitted successfully!</h1>
      <p className="mt-3 text-slate-600">We will contact you shortly.</p>
      {ref ? (
        <p className="mt-5 rounded-xl bg-navy-50 px-5 py-3 text-sm text-navy-800">
          Your enquiry reference: <strong className="font-bold">{ref}</strong>
          <span className="block text-xs text-slate-500">Save this number for faster follow-up.</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <WhatsAppButton href={waHref} meta={{ placement: 'thank-you' }}>Chat with us on WhatsApp</WhatsAppButton>
        <Link href="/" className="btn-outline">Back to Home</Link>
      </div>
    </div>
  );
}
