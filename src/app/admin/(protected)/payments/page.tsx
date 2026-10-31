import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDateTime, formatINR } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATUS_LABELS } from '@/lib/constants';
import { Pagination } from '@/components/admin/Pagination';
import { RefundForm } from '@/components/admin/RefundForm';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;

const PAY_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export default async function PaymentsPage({ searchParams }:
  { searchParams: { status?: string; page?: string } }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const statusFilter = PAY_STATUSES.includes(searchParams.status ?? '') ? searchParams.status : undefined;
  const where = statusFilter ? { status: statusFilter as never } : {};

  const [rows, total, sums] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: { include: { customer: true } },
        quotation: { include: { customer: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true, refundedAmount: true } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Payments</h1>
        <p className="text-sm text-slate-500">
          {total} payments · collected {formatINR(Number(sums._sum.amount ?? 0))}
          {Number(sums._sum.refundedAmount ?? 0) > 0 ? ` · refunded ${formatINR(Number(sums._sum.refundedAmount ?? 0))}` : ''}
        </p>
      </div>
      <form method="GET" className="flex items-center gap-2">
        <select name="status" defaultValue={searchParams.status ?? ''} className="input !w-auto !py-2">
          <option value="">All statuses</option>
          {PAY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
        </select>
        <button className="btn-outline btn-sm">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[1000px]">
          <thead>
            <tr><th>Payment</th><th>Customer</th><th>Quotation</th><th>Order</th><th>Amount</th><th>Method</th><th>Gateway Ref</th><th>Date</th><th>Status</th><th>Refund</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="py-14 text-center text-sm text-slate-400">No payments found.</td></tr>
            ) : rows.map((p) => {
              const customer = p.quotation?.customer ?? p.order?.customer;
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-slate-500">{p.invoice?.invoiceNo ?? p.id.slice(0, 8)}</td>
                  <td className="font-medium text-navy-900">{customer?.fullName ?? '—'}</td>
                  <td>{p.quotation ? <Link href={`/admin/quotations/${p.quotationId}`} className="font-medium text-royal-600 hover:underline">{p.quotation.quoteNo}</Link> : '—'}</td>
                  <td>{p.order ? <Link href={`/admin/orders/${p.orderId}`} className="font-medium text-royal-600 hover:underline">{p.order.orderNo}</Link> : '—'}</td>
                  <td className="font-semibold">{formatINR(p.amount.toString())}
                    {Number(p.refundedAmount) > 0 ? <span className="block text-xs font-normal text-purple-700">−{formatINR(p.refundedAmount.toString())} refunded</span> : null}</td>
                  <td className="text-xs">{STATUS_LABELS[p.gateway] ?? p.gateway}{p.gatewayMethod ? ` · ${p.gatewayMethod}` : p.gateway === 'MANUAL' ? ` · ${STATUS_LABELS[p.method]}` : ''}</td>
                  <td className="max-w-[140px] truncate font-mono text-[11px] text-slate-500">{p.gatewayPaymentId ?? p.reference ?? '—'}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(p.paidAt)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{(p.status === 'SUCCESS' || p.status === 'PARTIALLY_REFUNDED')
                    ? <RefundForm paymentId={p.id} maxAmount={Number(p.amount) - Number(p.refundedAmount)} />
                    : '—'}</td>
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
