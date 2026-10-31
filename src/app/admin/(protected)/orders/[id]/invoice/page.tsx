import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDate, formatINR } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/constants';
import { PrintButton } from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: { customer: true, payments: { orderBy: { paidAt: 'asc' } }, printSpec: true, delivery: true },
    }),
    getSettings(),
  ]);
  if (!order) notFound();
  const balance = Number(order.totalAmount) - Number(order.advancePaid);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href={`/admin/orders/${order.id}`} className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back to order</Link>
        <PrintButton />
      </div>

      <div className="card p-8">
        <div className="flex items-start justify-between border-b border-navy-100 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950">{settings.businessName}</h1>
            <p className="text-sm text-slate-500">{settings.tagline}</p>
            <p className="mt-2 text-xs text-slate-500">{settings.businessAddress}<br />{settings.contactPhone} · {settings.businessEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-navy-900">ORDER SUMMARY</p>
            <p className="text-sm font-semibold text-royal-600">{order.orderNo}</p>
            <p className="mt-1 text-xs text-slate-500">Date: {formatDate(order.createdAt)}</p>
            <p className="text-xs text-slate-500">Status: {STATUS_LABELS[order.status]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed To</h2>
            <p className="mt-1 font-semibold text-navy-900">{order.customer.fullName}</p>
            <p className="text-sm text-slate-600">{order.customer.mobile}</p>
            <p className="text-sm text-slate-600">{order.customer.college ?? ''}</p>
          </div>
          {order.delivery ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery</h2>
              <p className="mt-1 text-sm text-slate-600">{order.delivery.address}</p>
              <p className="text-sm text-slate-600">{order.delivery.area ?? ''}</p>
            </div>
          ) : null}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Description</th><th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit Price</th><th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy-50">
              <td className="py-3">
                <p className="font-medium text-navy-900">{order.title}</p>
                {order.printSpec ? (
                  <p className="text-xs text-slate-500">
                    {order.printSpec.totalPages} pages · {STATUS_LABELS[order.printSpec.printMode]} · {STATUS_LABELS[order.printSpec.sides]} · {STATUS_LABELS[order.printSpec.bindingType]}
                  </p>
                ) : null}
              </td>
              <td className="py-3 text-center">{order.quantity}</td>
              <td className="py-3 text-right">{formatINR(order.unitPrice.toString())}</td>
              <td className="py-3 text-right">{formatINR(Number(order.unitPrice) * order.quantity)}</td>
            </tr>
            {Number(order.additionalCharges) > 0 ? (
              <tr className="border-b border-navy-50"><td className="py-2" colSpan={3}>Additional charges</td><td className="py-2 text-right">{formatINR(order.additionalCharges.toString())}</td></tr>
            ) : null}
            {Number(order.deliveryCharges) > 0 ? (
              <tr className="border-b border-navy-50"><td className="py-2" colSpan={3}>Delivery charges</td><td className="py-2 text-right">{formatINR(order.deliveryCharges.toString())}</td></tr>
            ) : null}
            {Number(order.discount) > 0 ? (
              <tr className="border-b border-navy-50"><td className="py-2" colSpan={3}>Discount</td><td className="py-2 text-right">− {formatINR(order.discount.toString())}</td></tr>
            ) : null}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-56 space-y-1.5 text-sm">
          <div className="flex justify-between font-bold text-navy-950 text-base"><span>Total</span><span>{formatINR(order.totalAmount.toString())}</span></div>
          <div className="flex justify-between text-green-700"><span>Paid</span><span>{formatINR(order.advancePaid.toString())}</span></div>
          <div className="flex justify-between border-t border-navy-100 pt-1.5 font-semibold"><span>Balance Due</span><span>{formatINR(balance)}</span></div>
        </div>

        {order.payments.length ? (
          <div className="mt-6 border-t border-navy-100 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payments Received</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {order.payments.map((p) => (
                <li key={p.id}>{formatDate(p.paidAt)} — {formatINR(p.amount.toString())} via {STATUS_LABELS[p.method]}{p.reference ? ` (${p.reference})` : ''}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-400">
          Thank you for choosing {settings.businessName}! · {settings.contactPhone}
        </p>
      </div>
    </div>
  );
}
