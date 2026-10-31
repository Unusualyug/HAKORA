import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageCircle, Phone } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusSelect } from '@/components/admin/EnquiryControls';
import {
  AdminFileUpload, ArchiveDeleteButtons, CreateOrderForm, DeleteAttachmentButton, NoteForm, QuotationForm,
} from '@/components/admin/EnquiryDetailActions';

export const dynamic = 'force-dynamic';

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: params.id },
    include: {
      customer: { include: { enquiries: { orderBy: { createdAt: 'desc' }, take: 10 } } },
      attachments: { orderBy: { createdAt: 'desc' } },
      notesList: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      statusHistory: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      orders: { orderBy: { createdAt: 'desc' } },
      quotations: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!enquiry) notFound();
  const c = enquiry.customer;
  const waHref = waLink(`91${c.mobile}`, WA_MESSAGES.adminToStudent(c.fullName, enquiry.refNo));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/enquiries" className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <h1 className="text-xl font-bold text-navy-950">{enquiry.refNo}</h1>
          <StatusBadge status={enquiry.status} />
          {enquiry.archived ? <span className="badge bg-gray-200 text-gray-700">Archived</span> : null}
        </div>
        <ArchiveDeleteButtons enquiryId={enquiry.id} archived={enquiry.archived} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Requirement</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{enquiry.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ['Service', enquiry.serviceCategory ?? '—'],
                ['Course / Dept', enquiry.course ?? '—'],
                ['Semester', enquiry.semester ?? '—'],
                ['Quantity', enquiry.quantity ?? '—'],
                ['Deadline', enquiry.deadline ? formatDate(enquiry.deadline) : '—'],
                ['Delivery', enquiry.needsDelivery ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
            {enquiry.deliveryAddress ? (
              <p className="mt-4 rounded-xl bg-navy-50 p-3 text-sm text-slate-700">
                <strong className="text-navy-900">Delivery address:</strong> {enquiry.deliveryAddress}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-slate-400">
              Submitted {formatDateTime(enquiry.createdAt)} · Consent: {enquiry.consentGiven ? 'given ✓' : 'not recorded'}
            </p>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Attachments ({enquiry.attachments.length})</h2>
              <AdminFileUpload enquiryId={enquiry.id} />
            </div>
            {enquiry.attachments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No files attached.</p>
            ) : (
              <ul className="space-y-2">
                {enquiry.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm">
                    <a href={`/api/files/${a.id}`} target="_blank" className="flex items-center gap-2 font-medium text-royal-600 hover:underline">
                      <FileText className="h-4 w-4" /> {a.fileName}
                    </a>
                    <span className="flex items-center gap-3 text-xs text-slate-400">
                      {(a.sizeBytes / 1024 / 1024).toFixed(1)} MB · {a.uploadedBy}
                      <DeleteAttachmentButton attachmentId={a.id} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Internal Notes</h2>
            <NoteForm enquiryId={enquiry.id} />
            <ul className="mt-4 space-y-3">
              {enquiry.notesList.map((n) => (
                <li key={n.id} className="rounded-xl bg-navy-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{n.admin?.name ?? 'Admin'} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
              {enquiry.notesList.length === 0 ? <li className="text-sm text-slate-400">No notes yet.</li> : null}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Status History</h2>
            <ol className="space-y-2.5">
              {enquiry.statusHistory.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <StatusBadge status={h.toStatus} />
                  <span className="text-slate-500">
                    {h.note ? `${h.note} · ` : ''}{h.admin?.name ?? 'System'} · {formatDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Status</h2>
            <StatusSelect enquiryId={enquiry.id} current={enquiry.status} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Student</h2>
            <p className="font-semibold text-navy-900">{c.fullName}</p>
            <p className="mt-1 text-sm text-slate-600">{c.college ?? '—'}</p>
            <p className="text-sm text-slate-600">{c.department ?? ''}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:+91${c.mobile}`} className="btn-outline btn-sm"><Phone className="h-3.5 w-3.5" /> {c.mobile}</a>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
            <Link href={`/admin/customers/${c.id}`} className="mt-3 block text-sm font-medium text-royal-600 hover:underline">
              View customer profile →
            </Link>
            {c.enquiries.length > 1 ? (
              <div className="mt-4 border-t border-navy-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enquiry history</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {c.enquiries.filter((e) => e.id !== enquiry.id).slice(0, 6).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/enquiries/${e.id}`} className="text-royal-600 hover:underline">{e.refNo}</Link>
                      <StatusBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Quotation</h2>
            {enquiry.quotationAmount ? (
              <p className="mb-3 text-lg font-bold text-navy-950">{formatINR(enquiry.quotationAmount.toString())}</p>
            ) : null}
            <QuotationForm
              enquiryId={enquiry.id}
              amount={enquiry.quotationAmount?.toString() ?? ''}
              notes={enquiry.quotationNotes ?? ''}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Quotations</h2>
            {enquiry.quotations.length > 0 ? (
              <ul className="mb-3 space-y-2 text-sm">
                {enquiry.quotations.map((qt) => (
                  <li key={qt.id} className="flex items-center justify-between">
                    <Link href={`/admin/quotations/${qt.id}`} className="font-medium text-royal-600 hover:underline">{qt.quoteNo}</Link>
                    <StatusBadge status={qt.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="mb-3 text-sm text-slate-400">No quotations yet.</p>}
            <Link href={`/admin/quotations/new?enquiry=${enquiry.id}`} className="btn-royal btn-sm w-full">
              Create Quotation
            </Link>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Orders</h2>
            {enquiry.orders.length > 0 ? (
              <ul className="mb-3 space-y-2 text-sm">
                {enquiry.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-royal-600 hover:underline">{o.orderNo}</Link>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            ) : null}
            <CreateOrderForm
              enquiryId={enquiry.id}
              defaults={{
                title: `${enquiry.serviceCategory ?? 'Requirement'} — ${c.fullName}`,
                quantity: '1',
                unitPrice: enquiry.quotationAmount?.toString() ?? '',
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
