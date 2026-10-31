import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, formatINR, truncate } from '@/lib/utils';
import { waLink } from '@/lib/whatsapp';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CustomerEditForm, RegularToggle } from '@/components/admin/CustomerActions';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      enquiries: { orderBy: { createdAt: 'desc' } },
      orders: { include: { payments: { where: { status: 'SUCCESS' } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!customer) notFound();
  const spent = customer.orders.flatMap((o) => o.payments).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <h1 className="text-xl font-bold text-navy-950">{customer.fullName}</h1>
          <span className="badge bg-navy-100 text-navy-800">{customer.publicId}</span>
        </div>
        <RegularToggle customerId={customer.id} isRegular={customer.isRegular} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total Enquiries', customer.enquiries.length],
          ['Total Orders', customer.orders.length],
          ['Total Spending', formatINR(spent)],
          ['First Enquiry', formatDate(customer.firstEnquiry)],
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
            <h2 className="mb-3 font-semibold text-navy-900">Enquiry History</h2>
            {customer.enquiries.length === 0 ? <p className="text-sm text-slate-400">No enquiries.</p> : (
              <ul className="divide-y divide-navy-50">
                {customer.enquiries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/admin/enquiries/${e.id}`} className="font-semibold text-royal-600 hover:underline">{e.refNo}</Link>
                      <p className="truncate text-slate-500">{truncate(e.description, 70)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={e.status} />
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(e.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Order History</h2>
            {customer.orders.length === 0 ? <p className="text-sm text-slate-400">No orders.</p> : (
              <ul className="divide-y divide-navy-50">
                {customer.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-royal-600 hover:underline">{o.orderNo}</Link>
                      <p className="text-slate-500">{truncate(o.title, 60)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={o.status} />
                      <p className="mt-1 text-xs font-medium text-navy-900">{formatINR(o.totalAmount.toString())}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Contact</h2>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:+91${customer.mobile}`} className="btn-outline btn-sm"><Phone className="h-3.5 w-3.5" /> {customer.mobile}</a>
              <a
                href={waLink(`91${customer.mobile}`, `Hello ${customer.fullName}, this is regarding your requirements with us.`)}
                target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Edit Details</h2>
            <CustomerEditForm customer={{
              id: customer.id, fullName: customer.fullName, college: customer.college ?? '',
              department: customer.department ?? '', email: customer.email ?? '', notes: customer.notes ?? '',
            }} />
          </section>
        </div>
      </div>
    </div>
  );
}
