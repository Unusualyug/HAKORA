import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Send, Target } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'HAKORA is your trusted partner for academic document assistance and printing services for students.',
};
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const settings = await getSettings();
  const services = await prisma.service.findMany({
    where: { isActive: true }, orderBy: { displayOrder: 'asc' }, select: { name: true },
  });

  return (
    <div className="container-site max-w-4xl py-14">
      <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">About {settings.businessName}</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
        {settings.aboutContent.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <div className="card mt-10 flex items-start gap-4 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
          <Target className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-navy-900">Our Mission</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            To save students time and stress by handling academic documentation and printing end-to-end —
            with honest pricing, personal attention and dependable delivery.
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-navy-950">What We Do</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5 text-sm text-slate-700">
            <CheckCircle2 className="h-4.5 w-4.5 h-5 w-5 shrink-0 text-green-500" aria-hidden /> {s.name}
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-navy-950">How It Works</h2>
      <ol className="mt-5 space-y-4">
        {[
          'Submit your requirement on the website or message us on WhatsApp.',
          'We review it and contact you with a clear quotation.',
          'Approve the quote — we prepare, print and bind your work.',
          'Collect it or get doorstep delivery.',
        ].map((step, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{i + 1}</span>
            <p className="pt-1 text-sm text-slate-600">{step}</p>
          </li>
        ))}
      </ol>

      <div className="card mt-12 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-navy-950">Get In Touch</h2>
        <p className="mt-2 text-sm text-slate-600">
          {settings.contactPhone} · {settings.businessEmail}<br />
          {settings.businessHours}<br />
          Service area: {settings.serviceArea}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <WhatsAppButton
            href={waLink(settings.whatsappNumber, WA_MESSAGES.academic(settings.businessName))}
            meta={{ placement: 'about-academic' }}
          >
            Academic Assistance
          </WhatsAppButton>
          <WhatsAppButton
            href={waLink(settings.whatsappNumber, WA_MESSAGES.bulk(settings.businessName))}
            eventType="bulk_whatsapp_click"
            meta={{ placement: 'about-bulk' }}
          >
            Bulk Printing Quote
          </WhatsAppButton>
          <Link href="/submit-requirement" className="btn-outline"><Send className="h-4 w-4" /> Submit Requirement</Link>
        </div>
      </div>
    </div>
  );
}
