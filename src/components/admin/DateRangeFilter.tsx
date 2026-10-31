'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'prevmonth', label: 'Previous month' },
];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get('range') ?? '30d';

  const set = (params: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(params).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => set({ range: r.key, from: '', to: '' })}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            current === r.key ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 border border-navy-100 hover:bg-navy-50',
          )}
        >
          {r.label}
        </button>
      ))}
      <span className="mx-1 text-xs text-slate-400">or</span>
      <input
        type="date" className="input !w-auto !px-2 !py-1.5 text-xs" defaultValue={sp.get('from') ?? ''}
        onChange={(e) => e.target.value && set({ range: 'custom', from: e.target.value, to: sp.get('to') || e.target.value })}
        aria-label="From date"
      />
      <input
        type="date" className="input !w-auto !px-2 !py-1.5 text-xs" defaultValue={sp.get('to') ?? ''}
        onChange={(e) => e.target.value && set({ range: 'custom', to: e.target.value, from: sp.get('from') || e.target.value })}
        aria-label="To date"
      />
    </div>
  );
}
