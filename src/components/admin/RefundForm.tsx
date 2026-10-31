'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { recordQuotationRefund } from '@/server/actions/quotations';

export function RefundForm({ paymentId, maxAmount }: { paymentId: string; maxAmount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (maxAmount <= 0) return null;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm">
        <Undo2 className="h-3.5 w-3.5" /> Refund
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try { await recordQuotationRefund(paymentId, fd); setOpen(false); router.refresh(); }
          catch (err) { alert((err as Error).message); }
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input name="amount" type="number" min="1" max={maxAmount} step="0.01" defaultValue={maxAmount}
        className="input !w-28 !py-1.5 !text-xs" aria-label="Refund amount" />
      <input name="reason" placeholder="Reason" className="input !w-36 !py-1.5 !text-xs" />
      <button disabled={pending} className="btn-danger btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Confirm
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">✕</button>
    </form>
  );
}
