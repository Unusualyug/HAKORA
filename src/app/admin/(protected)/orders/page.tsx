import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { ORDER_STATUSES } from '@/lib/constants';
import { formatDate, formatINR, truncate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';
import { SearchBox } from '@/components/admin/SearchBox';
import { OrderStatusFilter } from '@/components/admin/OrderStatusFilter';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Record<string, unknown> = {};
  if (searchParams.status && (ORDER_STATUSES as readonly string[]).includes(searchParams.status)) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { orderNo: { contains: searchParams.q, mode: 'insensitive' } },
      { title: { contains: searchParams.q, mode: 'insensitive' } },
      { customer: { fullName: { contains: searchParams.q, mode: 'insensitive' } } },
      { customer: { mobile: { contains: searchParams.q } } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: where as never,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    prisma.order.count({ where: where as never }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Orders</h1>
        <p className="text-sm text-slate-500">{total} orders · create orders from an enquiry&apos;s detail page</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Search order no, title, customer…" />
        <OrderStatusFilter />
      </div>
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[900px]">
          <thead>
            <tr>
              <th>Order No</th><th>Customer</th><th>Title</th><th>Total</th>
              <th>Paid</th><th>Balance</th><th>Status</th><th>Expected</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-400">No orders yet. Open an enquiry and click &quot;Convert to Order&quot;.</td></tr>
            ) : rows.map((o) => {
              const balance = Number(o.totalAmount) - Number(o.advancePaid);
              return (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-royal-600 hover:underline">{o.orderNo}</Link></td>
                  <td className="font-medium text-navy-900">{o.customer.fullName}</td>
                  <td className="max-w-[220px]">{truncate(o.title, 50)}</td>
                  <td className="font-medium">{formatINR(o.totalAmount.toString())}</td>
                  <td className="text-green-700">{formatINR(o.advancePaid.toString())}</td>
                  <td className={balance > 0 ? 'font-medium text-red-600' : 'text-slate-400'}>{formatINR(balance)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs text-slate-500">{o.expectedCompletion ? formatDate(o.expectedCompletion) : '—'}</td>
                  <td><Link href={`/admin/orders/${o.id}`} className="btn-outline btn-sm">Open</Link></td>
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
