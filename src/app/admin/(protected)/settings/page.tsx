import { requireAdmin } from '@/lib/auth/guard';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { PasswordForm, SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const auditLogs = await prisma.auditLog.findMany({
    include: { admin: true }, orderBy: { createdAt: 'desc' }, take: 15,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Website Settings</h1>
        <p className="text-sm text-slate-500">All public-facing business details are configurable here.</p>
      </div>
      <SettingsForm settings={settings} />
      <PasswordForm />
      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Recent Admin Activity (Audit Log)</h2>
        <ul className="divide-y divide-navy-50 text-sm">
          {auditLogs.length === 0 ? <li className="py-3 text-slate-400">No activity yet.</li> : auditLogs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs text-navy-800">{l.action}</code>
                {l.entity ? <span className="ml-2 text-slate-500">{l.entity}</span> : null}
              </span>
              <span className="shrink-0 text-xs text-slate-400">{l.admin?.name ?? '—'} · {formatDateTime(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
