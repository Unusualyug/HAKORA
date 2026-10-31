import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDate, formatINR } from '@/lib/utils';
import { Pagination } from '@/components/admin/Pagination';
import { SearchBox } from '@/components/admin/SearchBox';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q;
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' as const } },
          { mobile: { contains: q } },
          { college: { contains: q, mode: 'insensitive' as const } },
          { publicId: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { enquiries: true, orders: true } },
        orders: { select: { payments: { where: { status: 'SUCCESS' }, select: { amount: true } } } },
      },
      orderBy: { lastActivity: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Customers</h1>
        <p className="text-sm text-slate-500">{total} customers</p>
      </div>
      <SearchBox placeholder="Search by name, mobile, college or customer ID…" />
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[800px]">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Mobile</th><th>College</th>
              <th>Enquiries</th><th>Orders</th><th>Total Spent</th><th>Last Activity</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-400">No customers found.</td></tr>
            ) : rows.map((r) => {
              const spent = r.orders.flatMap((o) => o.payments).reduce((s, p) => s + Number(p.amount), 0);
              return (
                <tr key={r.id}>
                  <td className="font-semibold text-slate-500">{r.publicId}</td>
                  <td>
                    <Link href={`/admin/customers/${r.id}`} className="font-medium text-royal-600 hover:underline">{r.fullName}</Link>
                    {r.isRegular ? <span className="badge ml-2 bg-amber-100 text-amber-800">Regular</span> : null}
                  </td>
                  <td>{r.mobile}</td>
                  <td>{r.college ?? '—'}</td>
                  <td className="text-center">{r._count.enquiries}</td>
                  <td className="text-center">{r._count.orders}</td>
                  <td className="font-medium">{formatINR(spent)}</td>
                  <td className="text-xs text-slate-500">{formatDate(r.lastActivity)}</td>
                  <td><Link href={`/admin/customers/${r.id}`} className="btn-outline btn-sm">View</Link></td>
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
