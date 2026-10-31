import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDate, formatINR, truncate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';
import { SearchBox } from '@/components/admin/SearchBox';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const QUOTE_STATUSES = ['DRAFT','SENT','VIEWED','ACCEPTED','PARTIALLY_PAID','PAID','EXPIRED','CANCELLED','SUPERSEDED'];

export default async function QuotationsPage({ searchParams }:
  { searchParams: { q?: string; status?: string; page?: string } }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Record<string, unknown> = {};
  if (searchParams.status && QUOTE_STATUSES.includes(searchParams.status)) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { quoteNo: { contains: searchParams.q, mode: 'insensitive' } },
      { title: { contains: searchParams.q, mode: 'insensitive' } },
      { customer: { fullName: { contains: searchParams.q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: searchParams.q } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.quotation.findMany({
      where: where as never,
      include: { customer: true, payments: true, enquiry: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    prisma.quotation.count({ where: where as never }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Quotations</h1>
          <p className="text-sm text-slate-500">{total} quotations · create one from an enquiry or from scratch</p>
        </div>
        <Link href="/admin/quotations/new" className="btn-royal btn-sm">+ New Quotation</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Search quote no, title, customer…" />
        <form method="GET" className="contents">
          <select name="status" defaultValue={searchParams.status ?? ''} className="input !w-auto !py-2">
            <option value="">All statuses</option>
            {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button className="btn-outline btn-sm">Filter</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[900px]">
          <thead>
            <tr><th>Quote No</th><th>Customer</th><th>Title</th><th>Total</th><th>Paid</th><th>Status</th><th>Valid Until</th><th>Enquiry</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-400">No quotations yet.</td></tr>
            ) : rows.map((q) => {
              const paid = q.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
              return (
                <tr key={q.id}>
                  <td><Link href={`/admin/quotations/${q.id}`} className="font-semibold text-royal-600 hover:underline">{q.quoteNo}</Link>
                    {q.revisionNo > 1 ? <span className="ml-1 text-xs text-slate-400">R{q.revisionNo}</span> : null}</td>
                  <td className="font-medium text-navy-900">{q.customer.fullName}</td>
                  <td className="max-w-[220px]">{truncate(q.title, 44)}</td>
                  <td className="font-medium">{formatINR(q.total.toString())}</td>
                  <td className={paid > 0 ? 'text-green-700 font-medium' : 'text-slate-400'}>{formatINR(paid)}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td className="text-xs text-slate-500">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="text-xs">{q.enquiry ? <Link href={`/admin/enquiries/${q.enquiryId}`} className="text-royal-600 hover:underline">{q.enquiry.refNo}</Link> : '—'}</td>
                  <td><Link href={`/admin/quotations/${q.id}`} className="btn-outline btn-sm">Open</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
