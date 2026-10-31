import 'server-only';
import { prisma } from '@/lib/db';

export type DateRange = { from: Date; to: Date };

export function resolveRange(range?: string, from?: string, to?: string): DateRange & { label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  switch (range) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now), label: 'Today' };
    case '7d': return { from: startOfDay(new Date(now.getTime() - 6 * 864e5)), to: endOfDay(now), label: 'Last 7 days' };
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now), label: 'This month' };
    case 'prevmonth': {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: f, to: t, label: 'Previous month' };
    }
    case 'custom':
      if (from && to) return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)), label: 'Custom range' };
      break;
  }
  return { from: startOfDay(new Date(now.getTime() - 29 * 864e5)), to: endOfDay(now), label: 'Last 30 days' };
}

export async function getDashboardStats(r: DateRange) {
  const inRange = { gte: r.from, lte: r.to };
  const [
    totalVisits, uniqueVisitors, totalEnquiries, newEnquiries, activeOrders, completedOrders,
    pendingOrders, totalCustomers, waClicks, revenueAll, revenueRange,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: 'page_view', createdAt: inRange } }),
    prisma.anonymousSession.count({ where: { lastSeenAt: inRange } }),
    prisma.enquiry.count({ where: { createdAt: inRange } }),
    prisma.enquiry.count({ where: { status: 'NEW', archived: false } }),
    prisma.order.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'DELIVERED'] } } }),
    prisma.order.count({ where: { status: { in: ['COMPLETED', 'DELIVERED'] } } }),
    prisma.order.count({ where: { status: { in: ['PENDING_CONFIRMATION', 'QUOTATION_SENT', 'PAYMENT_PENDING'] } } }),
    prisma.customer.count(),
    prisma.analyticsEvent.count({ where: { type: { in: ['whatsapp_click', 'bulk_whatsapp_click'] }, createdAt: inRange } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', paidAt: inRange } }),
  ]);
  return {
    totalVisits, uniqueVisitors, totalEnquiries, newEnquiries, activeOrders, completedOrders,
    pendingOrders, totalCustomers, waClicks,
    totalRevenue: Number(revenueAll._sum.amount ?? 0),
    rangeRevenue: Number(revenueRange._sum.amount ?? 0),
  };
}

const IST = 'Asia/Kolkata';
function dayKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(d); // YYYY-MM-DD
}
function monthKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
}

export async function getChartData(r: DateRange) {
  const [views, enquiries, payments, orders, serviceGroups, sessions, funnelEvents] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: r.from, lte: r.to } },
      select: { createdAt: true },
    }),
    prisma.enquiry.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 365 * 864e5) } },
      select: { createdAt: true, status: true },
    }),
    prisma.payment.findMany({
      where: { status: 'SUCCESS', paidAt: { gte: new Date(Date.now() - 365 * 864e5) } },
      select: { paidAt: true, amount: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.enquiry.groupBy({
      by: ['serviceCategory'], _count: true,
      where: { serviceCategory: { not: null }, createdAt: { gte: r.from, lte: r.to } },
    }),
    prisma.anonymousSession.findMany({
      where: { firstSeenAt: { gte: r.from, lte: r.to } },
      select: { referrer: true, utmSource: true, deviceType: true, browser: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['type'], _count: true, where: { createdAt: { gte: r.from, lte: r.to } },
    }),
  ]);

  // daily visitors within range
  const dayMap = new Map<string, number>();
  for (let d = new Date(r.from); d <= r.to; d = new Date(d.getTime() + 864e5)) dayMap.set(dayKey(d), 0);
  views.forEach((v) => {
    const k = dayKey(v.createdAt);
    dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
  });
  const dailyVisitors = Array.from(dayMap, ([date, views]) => ({
    date: date.slice(8) + '/' + date.slice(5, 7), views,
  }));

  // monthly enquiries + revenue (last 12 months)
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const enqByMonth = new Map(months.map((m) => [m, 0]));
  enquiries.forEach((e) => {
    const k = monthKey(e.createdAt);
    if (enqByMonth.has(k)) enqByMonth.set(k, (enqByMonth.get(k) ?? 0) + 1);
  });
  const revByMonth = new Map(months.map((m) => [m, 0]));
  payments.forEach((p) => {
    const k = monthKey(p.paidAt);
    if (revByMonth.has(k)) revByMonth.set(k, (revByMonth.get(k) ?? 0) + Number(p.amount));
  });
  const monthLabel = (m: string) => new Date(`${m}-01`).toLocaleString('en-IN', { month: 'short' });
  const monthlyEnquiries = months.map((m) => ({ month: monthLabel(m), count: enqByMonth.get(m) ?? 0 }));
  const monthlyRevenue = months.map((m) => ({ month: monthLabel(m), amount: revByMonth.get(m) ?? 0 }));

  const orderStatus = orders.map((o) => ({ name: o.status, value: o._count }));
  const topServices = serviceGroups
    .map((g) => ({ name: g.serviceCategory ?? 'Other', count: g._count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // traffic sources
  const srcMap = new Map<string, number>();
  sessions.forEach((s) => {
    let src = s.utmSource || '';
    if (!src && s.referrer) {
      try { src = new URL(s.referrer).hostname.replace(/^www\./, ''); } catch { src = 'other'; }
    }
    if (!src) src = 'Direct';
    srcMap.set(src, (srcMap.get(src) ?? 0) + 1);
  });
  const trafficSources = Array.from(srcMap, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  const deviceMap = new Map<string, number>();
  sessions.forEach((s) => {
    const d = s.deviceType ?? 'unknown';
    deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1);
  });
  const devices = Array.from(deviceMap, ([name, value]) => ({ name, value }));

  // funnel
  const ev = new Map(funnelEvents.map((f) => [f.type, f._count]));
  const confirmed = await prisma.enquiry.count({
    where: { createdAt: { gte: r.from, lte: r.to }, status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] } },
  });
  const submittedInRange = await prisma.enquiry.count({ where: { createdAt: { gte: r.from, lte: r.to } } });
  const funnel = [
    { stage: 'Visitors', count: sessions.length },
    { stage: 'Service interest', count: ev.get('service_click') ?? 0 },
    { stage: 'Form started', count: ev.get('form_start') ?? 0 },
    { stage: 'Enquiry submitted', count: submittedInRange },
    { stage: 'Order confirmed', count: confirmed },
  ];
  const conversionRate = submittedInRange > 0 ? Math.round((confirmed / submittedInRange) * 100) : 0;

  return { dailyVisitors, monthlyEnquiries, monthlyRevenue, orderStatus, topServices, trafficSources, devices, funnel, conversionRate };
}
