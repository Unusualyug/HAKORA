'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ServiceIcon } from '@/components/shared/ServiceIcon';
import { track } from './Analytics';

export type PublicService = {
  slug: string; name: string; shortDesc: string; icon: string;
  startingPrice: string | null; priceUnit: string | null;
};

export function ServiceCards({ services }: { services: PublicService[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <Link
          key={s.slug}
          href={`/submit-requirement?service=${encodeURIComponent(s.name)}`}
          onClick={() => track('service_click', { service: s.name })}
          className="card group p-6 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-600 group-hover:text-white">
            <ServiceIcon name={s.icon} className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-navy-900">{s.name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.shortDesc}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600">
            {s.startingPrice ? `From ₹${Number(s.startingPrice)} ${s.priceUnit ?? ''}` : 'Get a quote'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}
