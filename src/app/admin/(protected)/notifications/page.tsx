import Link from 'next/link';
import { Bell } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { MarkAllReadButton } from '@/components/admin/MarkAllReadButton';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireAdmin();
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  const unread = notifications.filter((n) => !n.isRead).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Notifications</h1>
          <p className="text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 ? <MarkAllReadButton /> : null}
      </div>
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="card p-14 text-center text-sm text-slate-400">No notifications yet.</div>
        ) : notifications.map((n) => (
          <div key={n.id} className={`card flex items-start gap-3.5 p-4 ${!n.isRead ? 'border-royal-200 bg-royal-50/40' : ''}`}>
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${!n.isRead ? 'bg-royal-600 text-white' : 'bg-navy-50 text-navy-400'}`}>
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy-900">{n.title}</p>
              {n.body ? <p className="mt-0.5 text-sm text-slate-500">{n.body}</p> : null}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
            </div>
            {n.link ? <Link href={n.link} className="btn-outline btn-sm shrink-0">Open</Link> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
