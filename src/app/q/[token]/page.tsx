import type { Metadata } from 'next';
import { CalendarClock, Download, FileText, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { hashAccessToken, isValidTokenFormat } from '@/lib/tokens';
import { getSettings } from '@/lib/settings';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import { isQuotationPayable } from '@/server/services/quotation';
import { waLink } from '@/lib/whatsapp';
import { Logo } from '@/components/shared/Logo';
import { PortalActions } from '@/components/portal/PortalActions';
import { StatusBadge } from '@/components/shared/StatusBadge';

export const metadata: Metadata = { title: 'Your Quotation', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function QuotationPortalPage({ params }: { params: { token: string } }) {
  const settings = await getSettings();
  const notFoundView = (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 p-6 text-center">
      <Logo name={settings.businessName} light />
      <h1 className="mt-8 text-2xl font-bold text-white">Quotation not found</h1>
      <p className="mt-2 max-w-sm text-sm text-navy-300">
        This link is invalid or has been replaced by a newer quotation. Please contact us on WhatsApp for an updated link.
      </p>
      <a
        href={waLink(settings.whatsappNumber, `Hello ${settings.businessName}, my quotation link is not working.`)}
        className="btn-whatsapp mt-6" target="_blank" rel="noopener noreferrer"
      >
        Contact on WhatsApp
      </a>
    </div>
  );

  if (!isValidTokenFormat(params.token)) return notFoundView;
  const q = await prisma.quotation.findUnique({
    where: { tokenHash: hashAccessToken(params.token) },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: 'asc' } },
      acceptance: true,
      payments: { orderBy: { createdAt: 'desc' } },
      invoices: true,
    },
  });
  if (!q || q.status === 'DRAFT') return notFoundView;

  // mark viewed (first open after sending)
  if (q.status === 'SENT') {
    await prisma.quotation.update({ where: { id: q.id }, data: { status: 'VIEWED', viewedAt: new Date() } });
    q.status = 'VIEWED';
  }

  const payable = isQuotationPayable(q);
  const paid = q.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(q.total);
  const balance = Math.max(0, total - paid);
  const advanceOption = q.advanceType !== 'FULL' && paid === 0 && Number(q.advanceAmount) < balance
    ? Number(q.advanceAmount) : null;

  const waHref = waLink(
    settings.whatsappNumber,
    `Hello ${settings.businessName}, I have a question about my quotation ${q.quoteNo}.`,
  );

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Branded header */}
      <header className="bg-navy-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Logo name={settings.businessName} tagline={settings.tagline} light />
          <span className="hidden items-center gap-1.5 text-xs text-navy-300 sm:flex">
            <ShieldCheck className="h-4 w-4 text-green-400" /> Secure quotation link
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {/* Status banners */}
        {!payable.ok ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            {payable.reason}
          </div>
        ) : null}
        {q.status === 'PAID' ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            ✅ Payment complete — thank you! Your order is confirmed and our team is on it.
          </div>
        ) : null}
        {q.status === 'PARTIALLY_PAID' ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            ✅ Advance received — your order is being processed. Balance of {formatINR(balance)} is due before delivery.
          </div>
        ) : null}

        <div className="card overflow-hidden">
          <div className="border-b border-navy-100 bg-white px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">Quotation</p>
                <h1 className="mt-1 text-xl font-bold text-navy-950">{q.quoteNo}{q.revisionNo > 1 ? ` · Rev ${q.revisionNo}` : ''}</h1>
              </div>
              <StatusBadge status={q.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prepared for</p>
                <p className="mt-0.5 font-semibold text-navy-900">{q.customer.fullName}</p>
                <p className="text-xs text-slate-500">{q.customer.college ?? ''}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p>
                <p className="mt-0.5 font-medium text-navy-900">{formatDate(q.createdAt)}</p>
              </div>
              {q.validUntil ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valid until</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-medium text-navy-900">
                    <CalendarClock className="h-4 w-4 text-amber-500" /> {formatDate(q.validUntil)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-5 sm:px-8">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900"><FileText className="h-4 w-4 text-royal-600" /> {q.title}</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((i) => (
                  <tr key={i.id} className="border-b border-navy-50">
                    <td className="py-2.5 pr-2 text-navy-900">{i.description}</td>
                    <td className="py-2.5 text-center text-slate-600">{Number(i.quantity)}</td>
                    <td className="py-2.5 text-right text-slate-600">{formatINR(i.unitPrice.toString())}</td>
                    <td className="py-2.5 text-right font-medium text-navy-900">{formatINR(i.lineTotal.toString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatINR(q.subtotal.toString())}</span></div>
              {Number(q.discount) > 0 ? (
                <div className="flex justify-between text-green-700"><span>Discount</span><span>− {formatINR(q.discount.toString())}</span></div>
              ) : null}
              {Number(q.taxAmount) > 0 ? (
                <div className="flex justify-between text-slate-500"><span>{q.taxLabel} ({Number(q.taxRate)}%)</span><span>{formatINR(q.taxAmount.toString())}</span></div>
              ) : null}
              <div className="flex justify-between border-t border-navy-100 pt-2 text-base font-bold text-navy-950">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
              {paid > 0 ? (
                <>
                  <div className="flex justify-between font-medium text-green-700"><span>Paid</span><span>{formatINR(paid)}</span></div>
                  <div className="flex justify-between font-semibold text-navy-900"><span>Balance</span><span>{formatINR(balance)}</span></div>
                </>
              ) : null}
            </div>

            {(q.paymentTerms || q.advanceType !== 'FULL') ? (
              <div className="mt-6 rounded-xl bg-navy-50 p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment terms</p>
                <p className="mt-1">
                  {q.advanceType !== 'FULL'
                    ? `Advance of ${formatINR(q.advanceAmount.toString())} confirms your order; the balance is due before delivery. `
                    : 'Full payment confirms your order. '}
                  {q.paymentTerms ?? ''}
                </p>
              </div>
            ) : null}
            {q.notes ? <p className="mt-4 whitespace-pre-wrap text-sm text-slate-500">{q.notes}</p> : null}
          </div>
        </div>

        {/* Actions */}
        <PortalActions
          token={params.token}
          payable={payable.ok}
          accepted={!!q.acceptance}
          balance={balance}
          advanceAmount={advanceOption}
          waHref={waHref}
          brand={settings.businessName}
        />

        {/* Payment history */}
        {q.payments.length > 0 ? (
          <div className="card p-5">
            <h3 className="font-semibold text-navy-900">Payment history</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {q.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
                  <span>
                    <strong className="text-navy-900">{formatINR(p.amount.toString())}</strong>
                    <span className="ml-2 text-xs text-slate-500">{p.gatewayMethod ?? (p.gateway === 'MANUAL' ? 'recorded by team' : 'online')}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-slate-400">{formatDateTime(p.paidAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-between pb-6">
          <a href={`/q/${params.token}/pdf`} target="_blank" className="btn-outline btn-sm">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </a>
          <p className="text-xs text-slate-400">
            {settings.businessName} · {settings.contactPhone}
          </p>
        </div>
      </main>
    </div>
  );
}
