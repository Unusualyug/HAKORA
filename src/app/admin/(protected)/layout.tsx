import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guard';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/admin/Sidebar';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const unread = await prisma.notification.count({ where: { isRead: false } });
  return (
    <div className="min-h-screen bg-navy-50/60">
      <Sidebar brand={settings.businessName} adminName={admin.name || admin.email} unread={unread} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
