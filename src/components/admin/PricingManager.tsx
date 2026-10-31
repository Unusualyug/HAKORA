'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { deletePricingRule, upsertPricingRule } from '@/server/actions/admin';
import { formatINR } from '@/lib/utils';

export type Rule = { key: string; label: string; unit: string; price: number; category: string; isActive: boolean; sortOrder: number };

export function PricingTable({ rules }: { rules: Rule[] }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const save = (fd: FormData) =>
    start(async () => {
      await upsertPricingRule(fd);
      setEditing(null); setAdding(false);
      router.refresh();
    });

  const form = (rule?: Rule) => (
    <form
      onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }}
      className="grid grid-cols-2 gap-3 rounded-xl border border-royal-100 bg-royal-50/50 p-4 sm:grid-cols-3"
    >
      <input type="hidden" name="key" value={rule?.key ?? ''} />
      <div className="col-span-2 sm:col-span-1"><label className="label">Label</label><input name="label" defaultValue={rule?.label} className="input" required /></div>
      <div><label className="label">Price (₹)</label><input name="price" type="number" min="0" step="0.01" defaultValue={rule?.price} className="input" required /></div>
      <div>
        <label className="label">Unit</label>
        <select name="unit" defaultValue={rule?.unit ?? 'per page'} className="input">
          <option>per page</option><option>per copy</option><option>flat</option>
        </select>
      </div>
      <div>
        <label className="label">Category</label>
        <select name="category" defaultValue={rule?.category ?? 'printing'} className="input">
          <option value="printing">Printing</option><option value="binding">Binding</option><option value="delivery">Delivery</option>
        </select>
      </div>
      <div><label className="label">Sort</label><input name="sortOrder" type="number" defaultValue={rule?.sortOrder ?? 0} className="input" /></div>
      <label className="flex items-end gap-2 pb-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={rule?.isActive ?? true} className="h-4 w-4 rounded" /> Active
      </label>
      <div className="col-span-2 flex gap-2 sm:col-span-3">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Rate</button>
        <button type="button" onClick={() => { setEditing(null); setAdding(false); }} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-3">
      {!adding && !editing ? (
        <button onClick={() => setAdding(true)} className="btn-royal btn-sm"><Plus className="h-3.5 w-3.5" /> Add Rate</button>
      ) : null}
      {adding ? form() : null}
      {editing ? form(editing) : null}
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[600px]">
          <thead><tr><th>Rate</th><th>Category</th><th>Unit</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.key}>
                <td className="font-medium text-navy-900">{r.label}</td>
                <td className="capitalize">{r.category}</td>
                <td>{r.unit}</td>
                <td className="font-semibold">{formatINR(r.price)}</td>
                <td>{r.isActive ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-gray-200 text-gray-600">Inactive</span>}</td>
                <td>
                  <span className="flex gap-1.5">
                    <button onClick={() => { setEditing(r); setAdding(false); }} className="btn-outline btn-sm">Edit</button>
                    <button
                      onClick={() => confirm(`Delete rate "${r.label}"?`) && start(async () => { await deletePricingRule(r.key); router.refresh(); })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QuotationCalculator({ rules }: { rules: Rule[] }) {
  const [docs, setDocs] = useState(1);
  const [pages, setPages] = useState(60);
  const [copies, setCopies] = useState(1);
  const [mode, setMode] = useState<'bw' | 'color'>('bw');
  const [sides, setSides] = useState<'single' | 'double'>('single');
  const [binding, setBinding] = useState('none');
  const [deliveryKey, setDeliveryKey] = useState('none');
  const [adjust, setAdjust] = useState(0);

  const rate = (key: string) => rules.find((r) => r.key === key && r.isActive)?.price ?? 0;

  const calc = useMemo(() => {
    const totalPages = docs * pages * copies;
    const printKey = `${mode}_${sides}_per_page`;
    const perPage = rate(printKey);
    const printing = totalPages * perPage;
    const bindingPrice = binding === 'none' ? 0 : rate(`${binding}_binding`) * docs * copies;
    const delivery = deliveryKey === 'none' ? 0 : rate(deliveryKey);
    const total = printing + bindingPrice + delivery + adjust;
    return { totalPages, perPage, printing, bindingPrice, delivery, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, pages, copies, mode, sides, binding, deliveryKey, adjust, rules]);

  const deliveryOptions = rules.filter((r) => r.category === 'delivery' && r.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Documents</label><input type="number" min={1} value={docs} onChange={(e) => setDocs(Math.max(1, +e.target.value))} className="input" /></div>
        <div><label className="label">Pages per document</label><input type="number" min={1} value={pages} onChange={(e) => setPages(Math.max(1, +e.target.value))} className="input" /></div>
        <div><label className="label">Copies</label><input type="number" min={1} value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))} className="input" /></div>
        <div>
          <label className="label">Print Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as never)} className="input">
            <option value="bw">Black &amp; White</option><option value="color">Color</option>
          </select>
        </div>
        <div>
          <label className="label">Sides</label>
          <select value={sides} onChange={(e) => setSides(e.target.value as never)} className="input">
            <option value="single">Single-sided</option><option value="double">Double-sided</option>
          </select>
        </div>
        <div>
          <label className="label">Binding</label>
          <select value={binding} onChange={(e) => setBinding(e.target.value)} className="input">
            <option value="none">None</option><option value="spiral">Spiral</option>
            <option value="hard">Hard</option><option value="soft">Soft</option>
          </select>
        </div>
        <div>
          <label className="label">Delivery</label>
          <select value={deliveryKey} onChange={(e) => setDeliveryKey(e.target.value)} className="input">
            <option value="none">No delivery</option>
            {deliveryOptions.map((d) => <option key={d.key} value={d.key}>{d.label} ({formatINR(d.price)})</option>)}
          </select>
        </div>
        <div><label className="label">Manual Adjustment (₹, ±)</label><input type="number" value={adjust} onChange={(e) => setAdjust(+e.target.value || 0)} className="input" /></div>
      </div>
      <div className="rounded-2xl bg-navy-950 p-6 text-white">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-300">Quotation</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-navy-300">Total printed pages</dt><dd className="font-semibold">{calc.totalPages.toLocaleString('en-IN')}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-300">Printing ({formatINR(calc.perPage)}/page)</dt><dd className="font-semibold">{formatINR(calc.printing)}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-300">Binding</dt><dd className="font-semibold">{formatINR(calc.bindingPrice)}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-300">Delivery</dt><dd className="font-semibold">{formatINR(calc.delivery)}</dd></div>
          {adjust !== 0 ? <div className="flex justify-between"><dt className="text-navy-300">Adjustment</dt><dd className="font-semibold">{formatINR(adjust)}</dd></div> : null}
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-navy-800 pt-4">
          <span className="text-navy-300">Final quotation</span>
          <span className="text-3xl font-extrabold">{formatINR(Math.max(0, calc.total))}</span>
        </div>
        <p className="mt-3 text-xs text-navy-400">Rates come from your configured pricing settings — change them in the table below without touching code.</p>
      </div>
    </div>
  );
}
