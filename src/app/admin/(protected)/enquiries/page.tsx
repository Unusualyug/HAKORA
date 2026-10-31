import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { ENQUIRY_STATUSES } from '@/lib/constants';
import { getSettings } from '@/lib/settings';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { EnquiryFilters } from '@/components/admin/EnquiryControls';
import { EnquiryTable } from '@/components/admin/EnquiryTable';
import { Pagination } from '@/components/admin/Pagination';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function EnquiriesPage({ searchParams }:
  { searchParams: { q?: string; status?: string; archived?: string; page?: string } }) {
  await requireAdmin();
  const settings = await getSettings();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Record<string, unknown> = { archived: searchParams.archived === '1' };
  if (searchParams.status && (ENQUIRY_STATUSES as readonly string[]).includes(searchParams.status)) where.status = searchParams.status;
  if (searchParams.q) {
    const q = searchParams.q;
    where.OR = [
      { refNo: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { customer: { fullName: { contains: q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: q } } },
      { customer: { college: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({
      where: where as never,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.enquiry.count({ where: where as never }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Enquiries</h1>
        <p className="text-sm text-slate-500">{total} enquiries {searchParams.archived === '1' ? '(archived)' : ''}</p>
      </div>
      <EnquiryFilters />
      <EnquiryTable
        rows={rows.map((r) => ({
          id: r.id, refNo: r.refNo, name: r.customer.fullName, mobile: r.customer.mobile,
          college: r.customer.college ?? '—', service: r.serviceCategory ?? '',
          summary: r.description, createdAt: r.createdAt.toISOString(), status: r.status,
          waHref: waLink(`91${r.customer.mobile}`, WA_MESSAGES.adminToStudent(r.customer.fullName, r.refNo)),
        }))}
      />
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
