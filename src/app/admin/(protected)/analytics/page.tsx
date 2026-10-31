import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { getChartData, resolveRange } from '@/server/services/stats';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import {
  VisitorsLineChart, HorizontalBarChart, StatusPieChart, FunnelBars,
} from '@/components/admin/Charts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  await requireAdmin();
  const range = resolveRange(searchParams.range, searchParams.from, searchParams.to);
  const inRange = { gte: range.from, lte: range.to };
  const [charts, events, topPages, browsers] = await Promise.all([
    getChartData(range),
    prisma.analyticsEvent.groupBy({ by: ['type'], _count: true, where: { createdAt: inRange } }),
    prisma.analyticsEvent.groupBy({
      by: ['path'], _count: true,
      where: { type: 'page_view', createdAt: inRange, path: { not: null } },
      orderBy: { _count: { path: 'desc' } }, take: 8,
    }),
    prisma.anonymousSession.groupBy({ by: ['browser'], _count: true, where: { lastSeenAt: inRange } }),
  ]);

  const ev = new Map(events.map((e) => [e.type, e._count]));
  const eventCards = [
    ['Page views', ev.get('page_view') ?? 0],
    ['Service card clicks', ev.get('service_click') ?? 0],
    ['Form starts', ev.get('form_start') ?? 0],
    ['Form submissions', ev.get('form_submit') ?? 0],
    ['WhatsApp clicks', ev.get('whatsapp_click') ?? 0],
    ['Bulk printing clicks', ev.get('bulk_whatsapp_click') ?? 0],
    ['Contact page views', ev.get('contact_view') ?? 0],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Analytics</h1>
        <p className="text-sm text-slate-500">{range.label} · anonymous first-party events only</p>
      </div>
      <DateRangeFilter />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {eventCards.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-navy-900">Daily Page Views</h2>
          <VisitorsLineChart data={charts.dailyVisitors} />
        </section>
        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-navy-900">Conversion Funnel</h2>
          <p className="mb-4 text-xs text-slate-500">Visitor → Service interest → Form started → Enquiry → Order confirmed</p>
          <FunnelBars data={charts.funnel} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Top Pages</h2>
          {topPages.length ? (
            <HorizontalBarChart data={topPages.map((p) => ({ name: p.path ?? '/', count: p._count }))} />
          ) : <p className="py-12 text-center text-sm text-slate-400">No page view data yet.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Traffic Sources</h2>
          {charts.trafficSources.length ? <StatusPieChart data={charts.trafficSources} /> :
            <p className="py-12 text-center text-sm text-slate-400">No session data yet.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Devices & Browsers</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>{charts.devices.length ? <StatusPieChart data={charts.devices} /> : <p className="py-12 text-center text-sm text-slate-400">No data.</p>}</div>
            <div>{browsers.length ? <StatusPieChart data={browsers.map((b) => ({ name: b.browser ?? 'Unknown', value: b._count }))} /> : <p className="py-12 text-center text-sm text-slate-400">No data.</p>}</div>
          </div>
        </section>
      </div>
      <p className="text-xs text-slate-400">
        Privacy note: visitors are tracked anonymously with a random first-party identifier. Personal details exist only
        when a student submits a form. Visitors who decline consent are not tracked.
      </p>
    </div>
  );
}
