import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { ServiceManager } from '@/components/admin/ServiceManager';

export const dynamic = 'force-dynamic';

export default async function ServicesAdminPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({ orderBy: { displayOrder: 'asc' } });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Services</h1>
        <p className="text-sm text-slate-500">
          These services power the public homepage grid — add or edit without touching code.
        </p>
      </div>
      <ServiceManager services={services.map((s) => ({
        id: s.id, slug: s.slug, name: s.name, shortDesc: s.shortDesc, longDesc: s.longDesc ?? '',
        icon: s.icon, startingPrice: s.startingPrice?.toString() ?? '', priceUnit: s.priceUnit ?? '',
        displayOrder: s.displayOrder, isFeatured: s.isFeatured, isActive: s.isActive,
      }))} />
    </div>
  );
}
