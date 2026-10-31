import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Send } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { waLink } from '@/lib/whatsapp';
import { ServiceIcon } from '@/components/shared/ServiceIcon';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await prisma.service.findUnique({ where: { slug: params.slug } });
  if (!service) return { title: 'Service Not Found' };
  return { title: service.name, description: service.shortDesc };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await prisma.service.findUnique({ where: { slug: params.slug } });
  if (!service || !service.isActive) notFound();
  const settings = await getSettings();

  return (
    <div className="container-site max-w-3xl py-14">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-royal-50 text-royal-600">
        <ServiceIcon name={service.icon} className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-navy-950 sm:text-4xl">{service.name}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{service.longDesc || service.shortDesc}</p>
      {service.startingPrice ? (
        <p className="mt-4 inline-block rounded-xl bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-900">
          Starting from ₹{Number(service.startingPrice)} {service.priceUnit ?? ''}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={`/submit-requirement?service=${encodeURIComponent(service.name)}`} className="btn-royal">
          <Send className="h-4 w-4" /> Request This Service
        </Link>
        <WhatsAppButton
          href={waLink(settings.whatsappNumber, `Hello ${settings.businessName}, I need help with ${service.name}.`)}
          meta={{ placement: 'service-detail', service: service.name }}
        >
          Ask on WhatsApp
        </WhatsAppButton>
      </div>
    </div>
  );
}
