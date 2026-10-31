import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ServiceCards } from '@/components/public/ServiceCards';

export const metadata: Metadata = {
  title: 'Our Services',
  description: 'Lab manuals, assignments, project reports, printing, spiral binding, bulk printing and more — all student services in one place.',
};
export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  return (
    <div className="container-site py-14">
      <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">Our Services</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Everything a student needs — from document preparation to printing, binding and delivery.
      </p>
      <div className="mt-10">
        <ServiceCards
          services={services.map((s) => ({
            slug: s.slug, name: s.name, shortDesc: s.shortDesc, icon: s.icon,
            startingPrice: s.startingPrice?.toString() ?? null, priceUnit: s.priceUnit,
          }))}
        />
      </div>
    </div>
  );
}
