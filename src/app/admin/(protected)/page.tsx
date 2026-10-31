import Link from 'next/link';
import {
  Eye, Users, Inbox, Sparkles, ShoppingCart, CheckCircle2, Clock, UserRound,
  MessageCircle, IndianRupee, Wallet,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { getDashboardStats, getChartData, resolveRange } from '@/server/services/stats';
import { formatINR } from '@/lib/utils';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import {
  VisitorsLineChart, SimpleBarChart, HorizontalBarChart, StatusPieChart, FunnelBars,
} from '@/components/admin/Charts';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  await requireAdmin();
  const range = resolveRange(searchParams.range, searchParams.from, searchParams.to);
  const [stats, charts] = await Promise.all([getDashboardStats(range), getChartData(range)]);

  const cards = [
    { label: 'Total Visits', value: stats.totalVisits, icon: Eye, tint: 'bg-royal-50 text-royal-600' },
    { label: 'Unique Visitors', value: stats.uniqueVisitors, icon: Users, tint: 'bg-sky-50 text-sky-600' },
    { label: 'Enquiries (range)', value: stats.totalEnquiries, icon: Inbox, tint: 'bg-indigo-50 text-indigo-600' },
    { label: 'New Enquiries', value: stats.newEnquiries, icon: Sparkles, tint: 'bg-amber-50 text-amber-600', href: '/admin/enquiries?status=NEW' },
    { label: 'Active Orders', value: stats.activeOrders, icon: ShoppingCart, tint: 'bg-purple-50 text-purple-600', href: '/admin/orders' },
    { label: 'Completed Orders', value: stats.completedOrders, icon: CheckCircle2, tint: 'bg-green-50 text-green-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, tint: 'bg-orange-50 text-orange-600' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: UserRound, tint: 'bg-teal-50 text-teal-600', href: '/admin/customers' },
    { label: 'WhatsApp Clicks', value: stats.waClicks, icon: MessageCircle, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Revenue (range)', value: formatINR(stats.rangeRevenue), icon: Wallet, tint: 'bg-lime-50 text-lime-700' },
    { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: IndianRupee, tint: 'bg-navy-50 text-navy-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Dashboard</h1>
          <p className="text-sm text-slate-500">{range.label} · live business data</p>
        </div>
      </div>
      <DateRangeFilter />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <div className="card flex items-center gap-3.5 p-4 transition hover:shadow-cardHover">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tint}`}>
                <c.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500">{c.label}</p>
                <p className="truncate text-xl font-bold text-navy-950">{c.value}</p>
              </div>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{body}</Link> : <div key={c.label}>{body}</div>;
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Daily Website Visitors</h2>
          <VisitorsLineChart data={charts.dailyVisitors} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Monthly Enquiries (12 months)</h2>
          <SimpleBarChart data={charts.monthlyEnquiries} xKey="month" yKey="count" name="Enquiries" />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Monthly Revenue (12 months)</h2>
          <SimpleBarChart data={charts.monthlyRevenue} xKey="month" yKey="amount" name="Revenue (₹)" color="#25D366" />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Order Status Distribution</h2>
          {charts.orderStatus.length ? <StatusPieChart data={charts.orderStatus} /> :
            <p className="py-16 text-center text-sm text-slate-400">No orders yet.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-navy-900">Most Requested Services</h2>
          {charts.topServices.length ? <HorizontalBarChart data={charts.topServices} /> :
            <p className="py-16 text-center text-sm text-slate-400">No service data in this range.</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-1 font-semibold text-navy-900">Conversion Funnel</h2>
          <p className="mb-4 text-xs text-slate-500">Enquiry → order conversion rate: <strong className="text-navy-900">{charts.conversionRate}%</strong></p>
          <FunnelBars data={charts.funnel} />
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-navy-900">Traffic Sources & Devices</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              {charts.trafficSources.length ? <StatusPieChart data={charts.trafficSources} /> :
                <p className="py-16 text-center text-sm text-slate-400">No session data yet.</p>}
            </div>
            <div>
              {charts.devices.length ? <StatusPieChart data={charts.devices} /> :
                <p className="py-16 text-center text-sm text-slate-400">No device data yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
