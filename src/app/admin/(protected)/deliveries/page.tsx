import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { DELIVERY_STATUSES } from '@/lib/constants';
import { formatDate, formatINR } from '@/lib/utils';
import { waLink } from '@/lib/whatsapp';
import { DeliveryStatusSelect } from '@/components/admin/DeliveryStatusSelect';

export const dynamic = 'force-dynamic';

export default async function DeliveriesPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireAdmin();
  const statusFilter = DELIVERY_STATUSES.includes(searchParams.status as never) ? searchParams.status : undefined;
  const where = statusFilter ? { status: statusFilter as never } : {};
  const deliveries = await prisma.delivery.findMany({
    where,
    include: { order: { include: { customer: true } } },
    orderBy: [{ expectedDate: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Deliveries</h1>
        <p className="text-sm text-slate-500">{deliveries.length} delivery records · create one from an order&apos;s detail page</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[950px]">
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Mobile</th><th>Address</th><th>Area</th>
              <th>Fee</th><th>Expected</th><th>Status</th><th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr><td colSpan={9} className="py-14 text-center text-sm text-slate-400">No deliveries scheduled yet.</td></tr>
            ) : deliveries.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/admin/orders/${d.orderId}`} className="font-semibold text-royal-600 hover:underline">{d.order.orderNo}</Link></td>
                <td className="font-medium text-navy-900">{d.contactName}</td>
                <td className="whitespace-nowrap">{d.mobile}</td>
                <td className="max-w-[220px] text-slate-600">{d.address}{d.landmark ? ` (${d.landmark})` : ''}</td>
                <td>{d.area ?? '—'}</td>
                <td>{formatINR(d.fee.toString())}</td>
                <td className="whitespace-nowrap text-xs">{d.expectedDate ? formatDate(d.expectedDate) : '—'}</td>
                <td><DeliveryStatusSelect deliveryId={d.id} current={d.status} /></td>
                <td>
                  <a
                    href={waLink(`91${d.mobile}`, `Hello ${d.contactName}, this is about the delivery of your order ${d.order.orderNo}.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-[#25D366]/10 p-1.5 text-[#128C4A] hover:bg-[#25D366]/20" title="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
