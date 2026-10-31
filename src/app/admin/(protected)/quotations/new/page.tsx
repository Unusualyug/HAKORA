import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { QuotationEditor } from '@/components/admin/QuotationEditor';

export const dynamic = 'force-dynamic';

export default async function NewQuotationPage({ searchParams }:
  { searchParams: { enquiry?: string; customer?: string } }) {
  await requireAdmin();

  let enquiry = null;
  if (searchParams.enquiry) {
    enquiry = await prisma.enquiry.findUnique({
      where: { id: searchParams.enquiry }, include: { customer: true },
    });
  }
  const customerId = enquiry?.customerId ?? searchParams.customer;
  const customer = enquiry?.customer ?? (customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : null);

  if (!customer) {
    // no customer context — let admin pick one
    const customers = await prisma.customer.findMany({ orderBy: { lastActivity: 'desc' }, take: 50 });
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-navy-950">New Quotation</h1>
        <p className="text-sm text-slate-500">Select the customer this quotation is for:</p>
        <div className="card divide-y divide-navy-50">
          {customers.map((c) => (
            <Link key={c.id} href={`/admin/quotations/new?customer=${c.id}`}
              className="flex items-center justify-between px-5 py-3 text-sm hover:bg-navy-50/50">
              <span className="font-medium text-navy-900">{c.fullName} <span className="ml-2 text-xs text-slate-400">{c.mobile}</span></span>
              <span className="text-xs text-slate-400">{c.college ?? ''}</span>
            </Link>
          ))}
          {customers.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">No customers yet — they are created automatically when enquiries arrive.</p> : null}
        </div>
      </div>
    );
  }

  const validUntil = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={enquiry ? `/admin/enquiries/${enquiry.id}` : '/admin/quotations'} className="btn-ghost btn-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-xl font-bold text-navy-950">New Quotation — {customer.fullName}</h1>
          <p className="text-sm text-slate-500">
            {enquiry ? <>From enquiry <span className="font-medium text-royal-600">{enquiry.refNo}</span> · </> : null}
            {customer.mobile} · {customer.college ?? ''}
          </p>
        </div>
      </div>
      {enquiry ? (
        <div className="card p-4 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Student requirement</p>
          <p className="mt-1 whitespace-pre-wrap">{enquiry.description}</p>
        </div>
      ) : null}
      <QuotationEditor
        mode="create"
        enquiryId={enquiry?.id ?? null}
        customerId={customer.id}
        initial={{
          title: enquiry ? `${enquiry.serviceCategory ?? 'Academic requirement'} — ${enquiry.refNo}` : '',
          notes: '', paymentTerms: '', validUntil,
          taxLabel: 'GST', taxRate: 0, discount: 0,
          advanceType: 'FULL', advanceValue: 0,
          items: enquiry?.quotationAmount
            ? [{ kind: 'SERVICE', description: enquiry.serviceCategory ?? 'Academic service', quantity: 1, unitPrice: Number(enquiry.quotationAmount) }]
            : [],
        }}
      />
    </div>
  );
}
