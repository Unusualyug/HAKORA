'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updateDeliveryStatus } from '@/server/actions/admin';
import { DELIVERY_STATUSES, STATUS_LABELS } from '@/lib/constants';

export function DeliveryStatusSelect({ deliveryId, current }: { deliveryId: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        className="input !w-auto !py-1.5 !text-xs" value={current} disabled={pending}
        onChange={(e) => start(async () => { await updateDeliveryStatus(deliveryId, e.target.value); router.refresh(); })}
        aria-label="Delivery status"
      >
        {DELIVERY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
    </span>
  );
}
