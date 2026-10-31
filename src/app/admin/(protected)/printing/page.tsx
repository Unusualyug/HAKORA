import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatINR } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PricingTable, QuotationCalculator } from '@/components/admin/PricingManager';

export const dynamic = 'force-dynamic';

export default async function PrintingPage() {
  await requireAdmin();
  const [rules, printOrders] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.printingSpecification.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Printing Management</h1>
        <p className="text-sm text-slate-500">Quotation calculator, configurable rates and active printing jobs.</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-navy-900">Quotation Calculator</h2>
        <QuotationCalculator rules={rules.map((r) => ({
          key: r.key, label: r.label, unit: r.unit, price: Number(r.price),
          category: r.category, isActive: r.isActive, sortOrder: r.sortOrder,
        }))} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Pricing Settings</h2>
        <PricingTable rules={rules.map((r) => ({
          key: r.key, label: r.label, unit: r.unit, price: Number(r.price),
          category: r.category, isActive: r.isActive, sortOrder: r.sortOrder,
        }))} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Printing Jobs</h2>
        <div className="card overflow-x-auto">
          <table className="table-admin min-w-[800px]">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Pages</th><th>Mode</th><th>Binding</th><th>Quoted</th><th>Order Status</th></tr>
            </thead>
            <tbody>
              {printOrders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                  No printing jobs yet. Add a printing specification from an order&apos;s detail page.
                </td></tr>
              ) : printOrders.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/orders/${p.orderId}`} className="font-semibold text-royal-600 hover:underline">{p.order.orderNo}</Link></td>
                  <td>{p.order.customer.fullName}</td>
                  <td>{p.totalPages.toLocaleString('en-IN')} <span className="text-xs text-slate-400">({p.copies}×{p.pagesPerDoc}p)</span></td>
                  <td>{STATUS_LABELS[p.printMode]} · {STATUS_LABELS[p.sides]}</td>
                  <td>{STATUS_LABELS[p.bindingType]}</td>
                  <td className="font-medium">{formatINR(p.quotedTotal.toString())}</td>
                  <td><StatusBadge status={p.order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
