import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink, History } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDateTime, formatINR } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATUS_LABELS } from '@/lib/constants';
import { QuotationEditor } from '@/components/admin/QuotationEditor';
import { QuotationStatusButtons, SendPanel } from '@/components/admin/QuotationActions';
import { RefundForm } from '@/components/admin/RefundForm';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [q, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        customer: true, enquiry: true, order: true,
        items: { orderBy: { sortOrder: 'asc' } },
        revisions: { orderBy: { revisionNo: 'desc' } },
        acceptance: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { refunds: true } },
        invoices: { orderBy: { issuedAt: 'desc' } },
      },
    }),
    getSettings(),
  ]);
  if (!q) notFound();

  const paid = q.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
  const locked = ['PAID', 'CANCELLED', 'SUPERSEDED'].includes(q.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotations" className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <h1 className="text-xl font-bold text-navy-950">{q.quoteNo}</h1>
          <StatusBadge status={q.status} />
          {q.revisionNo > 1 ? <span className="badge bg-navy-100 text-navy-800">Rev {q.revisionNo}</span> : null}
        </div>
        <div className="flex gap-2">
          <a href={`/api/admin/quotations/${q.id}/pdf`} target="_blank" className="btn-outline btn-sm">
            <Download className="h-3.5 w-3.5" /> PDF
          </a>
          <QuotationStatusButtons quotationId={q.id} status={q.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total', formatINR(q.total.toString())],
          ['Paid Online/Recorded', formatINR(paid)],
          ['Balance', formatINR(Math.max(0, Number(q.total) - paid))],
          ['Required to Confirm', formatINR(q.advanceType === 'FULL' ? q.total.toString() : q.advanceAmount.toString())],
        ].map(([k, v]) => (
          <div key={k as string} className="card p-4">
            <p className="text-xs font-medium text-slate-500">{k}</p>
            <p className="mt-1 text-lg font-bold text-navy-950">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuotationEditor
            mode="edit"
            quotationId={q.id}
            locked={locked}
            initial={{
              title: q.title, notes: q.notes ?? '', paymentTerms: q.paymentTerms ?? '',
              validUntil: q.validUntil ? q.validUntil.toISOString().slice(0, 10) : '',
              taxLabel: q.taxLabel, taxRate: Number(q.taxRate), discount: Number(q.discount),
              advanceType: q.advanceType as never, advanceValue: Number(q.advanceValue),
              items: q.items.map((i) => ({
                kind: i.kind, description: i.description,
                quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
              })),
            }}
          />
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Send to Student</h2>
            <SendPanel
              quotationId={q.id}
              hasLink={!!q.tokenHash}
              waBase={`91${q.customer.mobile}`}
              customerName={q.customer.fullName}
              quoteNo={q.quoteNo}
              brand={settings.businessName}
            />
            <dl className="mt-4 space-y-1.5 border-t border-navy-50 pt-3 text-xs text-slate-500">
              {q.sentAt ? <div className="flex justify-between"><dt>Sent</dt><dd>{formatDateTime(q.sentAt)}</dd></div> : null}
              {q.viewedAt ? <div className="flex justify-between"><dt>First viewed</dt><dd>{formatDateTime(q.viewedAt)}</dd></div> : null}
              {q.acceptance ? <div className="flex justify-between"><dt>Accepted</dt><dd className="text-green-700 font-medium">{formatDateTime(q.acceptance.acceptedAt)}</dd></div> : null}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 font-semibold text-navy-900">Customer</h2>
            <p className="font-semibold text-navy-900">{q.customer.fullName}</p>
            <p className="text-sm text-slate-600">{q.customer.mobile} · {q.customer.college ?? ''}</p>
            <div className="mt-2 space-y-1 text-sm">
              <Link href={`/admin/customers/${q.customerId}`} className="block font-medium text-royal-600 hover:underline">View profile →</Link>
              {q.enquiry ? <Link href={`/admin/enquiries/${q.enquiryId}`} className="block font-medium text-royal-600 hover:underline">Enquiry {q.enquiry.refNo} →</Link> : null}
              {q.order ? <Link href={`/admin/orders/${q.orderId}`} className="block font-medium text-royal-600 hover:underline">Order {q.order.orderNo} <ExternalLink className="inline h-3 w-3" /></Link> : null}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Payments</h2>
            {q.payments.length === 0 ? <p className="text-sm text-slate-400">No payments yet.</p> : (
              <ul className="space-y-2.5">
                {q.payments.map((p) => (
                  <li key={p.id} className="rounded-lg bg-navy-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <strong className="text-navy-900">{formatINR(p.amount.toString())}</strong>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {STATUS_LABELS[p.gateway] ?? p.gateway}{p.gatewayMethod ? ` · ${p.gatewayMethod}` : ''}
                      {p.gatewayPaymentId ? ` · ${p.gatewayPaymentId}` : ''} · {formatDateTime(p.paidAt)}
                    </p>
                    {Number(p.refundedAmount) > 0 ? (
                      <p className="mt-1 text-xs font-medium text-purple-700">Refunded: {formatINR(p.refundedAmount.toString())}</p>
                    ) : null}
                    {(p.status === 'SUCCESS' || p.status === 'PARTIALLY_REFUNDED') ? (
                      <div className="mt-2">
                        <RefundForm paymentId={p.id} maxAmount={Number(p.amount) - Number(p.refundedAmount)} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {q.invoices.length > 0 ? (
              <div className="mt-3 border-t border-navy-50 pt-3 text-xs text-slate-500">
                {q.invoices.map((inv) => (
                  <p key={inv.id}>Receipt <strong className="text-navy-800">{inv.invoiceNo}</strong> — {formatINR(inv.amount.toString())} · {formatDateTime(inv.issuedAt)}</p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy-900"><History className="h-4 w-4" /> Revision History</h2>
            {q.revisions.length === 0 ? <p className="text-sm text-slate-400">No revisions — this is the original version.</p> : (
              <ul className="space-y-2 text-sm">
                {q.revisions.map((r) => {
                  const snap = r.snapshot as { total?: string; title?: string };
                  return (
                    <li key={r.id} className="rounded-lg border border-navy-100 px-3 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-navy-900">Rev {r.revisionNo}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{snap.title} — total {formatINR(snap.total ?? '0')}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
