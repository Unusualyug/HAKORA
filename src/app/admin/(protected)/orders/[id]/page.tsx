import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageCircle, Printer } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATUS_LABELS } from '@/lib/constants';
import {
  DeliveryForm, OrderEditForm, OrderStatusSelect, PaymentForm, PrintSpecForm,
} from '@/components/admin/OrderActions';
import { DeliveryStatusSelect } from '@/components/admin/DeliveryStatusSelect';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true, enquiry: true, payments: { orderBy: { paidAt: 'desc' } },
      printSpec: true, delivery: true,
    },
  });
  if (!order) notFound();
  const balance = Number(order.totalAmount) - Number(order.advancePaid);
  const waHref = waLink(`91${order.customer.mobile}`, WA_MESSAGES.orderFollowUp(order.orderNo));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <h1 className="text-xl font-bold text-navy-950">{order.orderNo}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex gap-2">
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Customer
          </a>
          <Link href={`/admin/orders/${order.id}/invoice`} className="btn-outline btn-sm">
            <Printer className="h-3.5 w-3.5" /> Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total Amount', formatINR(order.totalAmount.toString())],
          ['Paid', formatINR(order.advancePaid.toString())],
          ['Balance', formatINR(balance)],
          ['Expected', order.expectedCompletion ? formatDate(order.expectedCompletion) : '—'],
        ].map(([k, v]) => (
          <div key={k as string} className="card p-4">
            <p className="text-xs font-medium text-slate-500">{k}</p>
            <p className="mt-1 text-lg font-bold text-navy-950">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Order Details</h2>
            <OrderEditForm order={{
              id: order.id, title: order.title, description: order.description ?? '',
              serviceType: order.serviceType ?? '', quantity: String(order.quantity),
              pages: order.pages ? String(order.pages) : '',
              unitPrice: order.unitPrice.toString(), additionalCharges: order.additionalCharges.toString(),
              deliveryCharges: order.deliveryCharges.toString(), discount: order.discount.toString(),
              expectedCompletion: order.expectedCompletion ? order.expectedCompletion.toISOString().slice(0, 10) : '',
              internalNotes: order.internalNotes ?? '',
            }} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Printing Specification</h2>
            <PrintSpecForm orderId={order.id} spec={order.printSpec ? {
              documents: String(order.printSpec.documents), pagesPerDoc: String(order.printSpec.pagesPerDoc),
              copies: String(order.printSpec.copies), printMode: order.printSpec.printMode,
              sides: order.printSpec.sides, bindingType: order.printSpec.bindingType,
              paperSize: order.printSpec.paperSize, paperQuality: order.printSpec.paperQuality,
              printingPrice: order.printSpec.printingPrice.toString(), bindingPrice: order.printSpec.bindingPrice.toString(),
              deliveryPrice: order.printSpec.deliveryPrice.toString(), quotedTotal: order.printSpec.quotedTotal.toString(),
              notes: order.printSpec.notes ?? '',
            } : {}} />
            {order.printSpec ? (
              <p className="mt-3 text-xs text-slate-500">
                Total printed pages: <strong>{order.printSpec.totalPages}</strong> ·
                Use the <Link href="/admin/printing" className="text-royal-600 underline">quotation calculator</Link> for configured rates.
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Delivery</h2>
            {order.delivery ? (
              <div className="mb-4 flex items-center gap-3">
                <StatusBadge status={order.delivery.status} />
                <DeliveryStatusSelect deliveryId={order.delivery.id} current={order.delivery.status} />
              </div>
            ) : <p className="mb-3 text-sm text-slate-400">No delivery scheduled yet — fill the form to create one.</p>}
            <DeliveryForm orderId={order.id} delivery={order.delivery ? {
              contactName: order.delivery.contactName, mobile: order.delivery.mobile,
              address: order.delivery.address, landmark: order.delivery.landmark ?? '',
              area: order.delivery.area ?? '', fee: order.delivery.fee.toString(),
              expectedDate: order.delivery.expectedDate ? order.delivery.expectedDate.toISOString().slice(0, 10) : '',
              notes: order.delivery.notes ?? '',
            } : {
              contactName: order.customer.fullName, mobile: order.customer.mobile,
              address: order.enquiry?.deliveryAddress ?? '', landmark: '', area: '', fee: order.deliveryCharges.toString(),
              expectedDate: '', notes: '',
            }} />
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Status</h2>
            <OrderStatusSelect orderId={order.id} current={order.status} />
          </section>
          <section className="card p-5">
            <h2 className="mb-2 font-semibold text-navy-900">Customer</h2>
            <p className="font-semibold text-navy-900">{order.customer.fullName}</p>
            <p className="text-sm text-slate-600">{order.customer.mobile}</p>
            <p className="text-sm text-slate-600">{order.customer.college ?? ''}</p>
            <Link href={`/admin/customers/${order.customerId}`} className="mt-2 block text-sm font-medium text-royal-600 hover:underline">
              View profile →
            </Link>
            {order.enquiry ? (
              <p className="mt-2 text-sm">
                From enquiry{' '}
                <Link href={`/admin/enquiries/${order.enquiry.id}`} className="font-medium text-royal-600 hover:underline">
                  {order.enquiry.refNo}
                </Link>
              </p>
            ) : null}
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Payments</h2>
            {order.payments.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm">
                    <span>
                      <strong className="text-navy-900">{formatINR(p.amount.toString())}</strong>
                      <span className="ml-2 text-xs text-slate-500">{STATUS_LABELS[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(p.paidAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mb-3 text-sm text-slate-400">No payments recorded.</p>}
            <PaymentForm orderId={order.id} />
          </section>
          <section className="card p-5">
            <h2 className="mb-2 font-semibold text-navy-900">Summary</h2>
            <dl className="space-y-1.5 text-sm">
              {[
                ['Unit price × qty', formatINR(Number(order.unitPrice) * order.quantity)],
                ['Additional charges', formatINR(order.additionalCharges.toString())],
                ['Delivery charges', formatINR(order.deliveryCharges.toString())],
                ['Discount', `− ${formatINR(order.discount.toString())}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
              <div className="flex justify-between border-t border-navy-100 pt-2 text-base">
                <dt className="font-semibold text-navy-900">Total</dt>
                <dd className="font-bold text-navy-950">{formatINR(order.totalAmount.toString())}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
