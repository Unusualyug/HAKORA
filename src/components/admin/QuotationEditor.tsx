'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createQuotation, updateQuotation } from '@/server/actions/quotations';
import { formatINR } from '@/lib/utils';

export type EditorItem = { kind: string; description: string; quantity: number; unitPrice: number };
export type EditorInitial = {
  title: string; notes: string; paymentTerms: string; validUntil: string;
  taxLabel: string; taxRate: number; discount: number;
  advanceType: 'FULL' | 'PERCENT' | 'FIXED'; advanceValue: number;
  items: EditorItem[];
};

const KINDS = [
  ['SERVICE', 'Service'], ['PRINTING', 'Printing'], ['BINDING', 'Binding'],
  ['DELIVERY', 'Delivery'], ['OTHER', 'Other'],
] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function QuotationEditor({
  mode, quotationId, enquiryId, customerId, initial, locked,
}: {
  mode: 'create' | 'edit';
  quotationId?: string;
  enquiryId?: string | null;
  customerId?: string;
  initial: EditorInitial;
  locked?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EditorItem[]>(initial.items.length ? initial.items : [
    { kind: 'SERVICE', description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState(initial.discount);
  const [taxRate, setTaxRate] = useState(initial.taxRate);
  const [advanceType, setAdvanceType] = useState(initial.advanceType);
  const [advanceValue, setAdvanceValue] = useState(initial.advanceValue);

  const totals = useMemo(() => {
    const subtotal = r2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = r2((taxable * taxRate) / 100);
    const total = r2(taxable + taxAmount);
    let advance = total;
    if (advanceType === 'PERCENT') advance = r2((total * Math.min(100, Math.max(0, advanceValue))) / 100);
    if (advanceType === 'FIXED') advance = r2(Math.min(total, Math.max(0, advanceValue)));
    return { subtotal, taxAmount, total, advance };
  }, [items, discount, taxRate, advanceType, advanceValue]);

  const setItem = (idx: number, patch: Partial<EditorItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('itemsJson', JSON.stringify(items));
    start(async () => {
      try {
        if (mode === 'create') {
          await createQuotation(enquiryId ?? null, customerId!, fd); // redirects
        } else {
          await updateQuotation(quotationId!, fd);
          setSaved(true);
          router.refresh();
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('NEXT_REDIRECT')) throw err;
        setError(msg);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {locked ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This quotation can no longer be edited (paid, cancelled or superseded).
        </div>
      ) : null}

      <fieldset disabled={locked || pending} className="space-y-5">
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Quotation Title</label>
              <input name="title" defaultValue={initial.title} className="input" required placeholder="e.g. CS Lab Manual — print & spiral binding (2 copies)" />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input name="validUntil" type="date" defaultValue={initial.validUntil} className="input" />
            </div>
            <div>
              <label className="label">Payment Terms (shown to student)</label>
              <input name="paymentTerms" defaultValue={initial.paymentTerms} className="input" placeholder="e.g. Balance due before delivery." />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-navy-900">Line Items</h3>
          <div className="space-y-2.5">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <select
                  value={it.kind} onChange={(e) => setItem(i, { kind: e.target.value })}
                  className="input col-span-4 sm:col-span-2 !py-2 text-xs"
                  aria-label="Item type"
                >
                  {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input
                  value={it.description} onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder="Description" className="input col-span-8 sm:col-span-5 !py-2"
                />
                <input
                  type="number" min="0" step="0.5" value={it.quantity}
                  onChange={(e) => setItem(i, { quantity: Math.max(0, +e.target.value) })}
                  className="input col-span-3 sm:col-span-1 !py-2" aria-label="Quantity"
                />
                <input
                  type="number" min="0" step="0.01" value={it.unitPrice}
                  onChange={(e) => setItem(i, { unitPrice: Math.max(0, +e.target.value) })}
                  className="input col-span-4 sm:col-span-2 !py-2" aria-label="Unit price"
                />
                <div className="col-span-4 text-right text-sm font-semibold text-navy-900 sm:col-span-1">
                  {formatINR(r2(it.quantity * it.unitPrice))}
                </div>
                <button
                  type="button" onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                  disabled={items.length <= 1}
                  className="col-span-1 justify-self-end rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems((arr) => [...arr, { kind: 'OTHER', description: '', quantity: 1, unitPrice: 0 }])}
            className="btn-outline btn-sm mt-3"
          >
            <Plus className="h-3.5 w-3.5" /> Add Line
          </button>
        </div>

        {/* Pricing & terms */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-4 p-5">
            <h3 className="font-semibold text-navy-900">Adjustments & Tax</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Discount (₹)</label>
                <input name="discount" type="number" min="0" step="0.01" value={discount}
                  onChange={(e) => setDiscount(Math.max(0, +e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Tax Rate (%)</label>
                <input name="taxRate" type="number" min="0" max="28" step="0.01" value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, +e.target.value))} className="input" />
              </div>
              <div>
                <label className="label">Tax Label</label>
                <input name="taxLabel" defaultValue={initial.taxLabel} className="input" />
              </div>
            </div>
            <h3 className="pt-2 font-semibold text-navy-900">Advance / Payment Requirement</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select name="advanceType" value={advanceType} onChange={(e) => setAdvanceType(e.target.value as never)} className="input">
                  <option value="FULL">Full payment required</option>
                  <option value="PERCENT">Advance — % of total</option>
                  <option value="FIXED">Advance — fixed amount</option>
                </select>
              </div>
              {advanceType !== 'FULL' ? (
                <div>
                  <label className="label">{advanceType === 'PERCENT' ? 'Advance %' : 'Advance ₹'}</label>
                  <input name="advanceValue" type="number" min="0" step="0.01" value={advanceValue}
                    onChange={(e) => setAdvanceValue(Math.max(0, +e.target.value))} className="input" />
                </div>
              ) : <input type="hidden" name="advanceValue" value="0" />}
            </div>
            <div>
              <label className="label">Internal / Student Notes</label>
              <textarea name="notes" rows={2} defaultValue={initial.notes} className="input resize-y" placeholder="Shown on the quotation" />
            </div>
          </div>

          <div className="rounded-2xl bg-navy-950 p-6 text-white">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-300">Live Totals</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-navy-300">Subtotal</dt><dd className="font-semibold">{formatINR(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-300">Discount</dt><dd className="font-semibold">− {formatINR(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-300">Tax ({taxRate}%)</dt><dd className="font-semibold">{formatINR(totals.taxAmount)}</dd></div>
            </dl>
            <div className="mt-4 flex items-end justify-between border-t border-navy-800 pt-4">
              <span className="text-navy-300">Total</span>
              <span className="text-3xl font-extrabold">{formatINR(totals.total)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-900 px-4 py-2.5 text-sm">
              <span className="text-navy-300">Required to confirm</span>
              <span className="font-bold text-green-400">{formatINR(advanceType === 'FULL' ? totals.total : totals.advance)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={pending} className="btn-royal">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? 'Create Quotation' : 'Save Changes'}
          </button>
          {saved && !pending ? <span className="text-sm font-medium text-green-600">Saved ✓ {mode === 'edit' ? '(revision recorded if it was already sent)' : ''}</span> : null}
        </div>
      </fieldset>
    </form>
  );
}
