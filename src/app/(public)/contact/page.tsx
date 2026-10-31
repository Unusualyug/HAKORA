import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { ContactForm } from '@/components/forms/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact HAKORA on WhatsApp, phone or through our contact form for academic assistance and printing services.',
};
export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="container-site py-14">
      <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">Contact Us</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        The fastest way to reach us is WhatsApp — or send a message using the form below.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="card space-y-4 p-6">
            {[
              { icon: Phone, label: 'Phone', value: settings.contactPhone },
              { icon: Mail, label: 'Email', value: settings.businessEmail },
              { icon: Clock, label: 'Business Hours', value: settings.businessHours },
              { icon: MapPin, label: 'Service Area', value: settings.serviceArea },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <row.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</p>
                  <p className="text-sm font-medium text-navy-900">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-navy-900">Chat on WhatsApp</h2>
            <p className="mt-1 text-sm text-slate-500">Pick the option that matches your need:</p>
            <div className="mt-4 flex flex-col gap-3">
              <WhatsAppButton
                href={waLink(settings.whatsappNumber, WA_MESSAGES.academic(settings.businessName))}
                meta={{ placement: 'contact-academic' }}
              >
                Academic Assistance
              </WhatsAppButton>
              <WhatsAppButton
                href={waLink(settings.whatsappNumber, WA_MESSAGES.bulk(settings.businessName))}
                eventType="bulk_whatsapp_click"
                meta={{ placement: 'contact-bulk' }}
              >
                Bulk Printing Quotation
              </WhatsAppButton>
            </div>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-navy-900">Send Us a Message</h2>
          <p className="mt-1 text-sm text-slate-500">We usually respond within business hours.</p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
