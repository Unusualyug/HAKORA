'use client';

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { STATUS_LABELS } from '@/lib/constants';

const PALETTE = ['#284ce2', '#25D366', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b', '#10b981', '#f97316', '#3b82f6', '#a855f7'];

const tooltipStyle = { borderRadius: 12, border: '1px solid #dce5f3', fontSize: 12 };

export function VisitorsLineChart({ data }: { data: { date: string; views: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="views" name="Page views" stroke="#284ce2" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, xKey, yKey, name, color = '#284ce2' }:
  { data: Record<string, unknown>[]; xKey: string; yKey: string; name: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={yKey} name={name} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 30, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Enquiries" fill="#25D366" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  const labelled = data.map((d) => ({ ...d, name: STATUS_LABELS[d.name] ?? d.name }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={labelled} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {labelled.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.stage}>
          <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
            <span>{d.stage}</span><span>{d.count}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-navy-50">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
