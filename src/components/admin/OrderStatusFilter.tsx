'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/constants';

export function OrderStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      className="input !w-auto !py-2" value={sp.get('status') ?? ''}
      onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        if (e.target.value) next.set('status', e.target.value); else next.delete('status');
        next.delete('page');
        router.push(`${pathname}?${next.toString()}`);
      }}
      aria-label="Filter by status"
    >
      <option value="">All statuses</option>
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
    </select>
  );
}
