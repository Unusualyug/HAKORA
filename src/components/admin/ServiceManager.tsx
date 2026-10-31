'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { deleteService, upsertService } from '@/server/actions/admin';
import { ServiceIcon, SERVICE_ICON_NAMES } from '@/components/shared/ServiceIcon';

export type ServiceRow = {
  id: string; slug: string; name: string; shortDesc: string; longDesc: string; icon: string;
  startingPrice: string; priceUnit: string; displayOrder: number; isFeatured: boolean; isActive: boolean;
};

export function ServiceManager({ services }: { services: ServiceRow[] }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const save = (id: string | null, fd: FormData) =>
    start(async () => {
      await upsertService(id, fd);
      setEditing(null); setAdding(false);
      router.refresh();
    });

  const form = (s?: ServiceRow) => (
    <form
      onSubmit={(e) => { e.preventDefault(); save(s?.id ?? null, new FormData(e.currentTarget)); }}
      className="card space-y-3 border-royal-200 p-5"
    >
      <h3 className="font-bold text-navy-900">{s ? `Edit: ${s.name}` : 'Add New Service'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Name</label><input name="name" defaultValue={s?.name} className="input" required /></div>
        <div>
          <label className="label">Icon</label>
          <select name="icon" defaultValue={s?.icon ?? 'FileText'} className="input">
            {SERVICE_ICON_NAMES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Short Description</label><input name="shortDesc" defaultValue={s?.shortDesc} className="input" required /></div>
        <div className="sm:col-span-2"><label className="label">Long Description (service page)</label><textarea name="longDesc" rows={3} defaultValue={s?.longDesc} className="input resize-y" /></div>
        <div><label className="label">Starting Price (₹, optional)</label><input name="startingPrice" type="number" min="0" step="0.01" defaultValue={s?.startingPrice} className="input" /></div>
        <div><label className="label">Price Unit</label><input name="priceUnit" defaultValue={s?.priceUnit} className="input" placeholder="per page / per copy" /></div>
        <div><label className="label">Display Order</label><input name="displayOrder" type="number" defaultValue={s?.displayOrder ?? 0} className="input" /></div>
        <div className="flex items-end gap-5 pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isFeatured" defaultChecked={s?.isFeatured} className="h-4 w-4 rounded" /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isActive" defaultChecked={s?.isActive ?? true} className="h-4 w-4 rounded" /> Active
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Service</button>
        <button type="button" onClick={() => { setEditing(null); setAdding(false); }} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      {!adding && !editing ? (
        <button onClick={() => setAdding(true)} className="btn-royal btn-sm"><Plus className="h-3.5 w-3.5" /> Add Service</button>
      ) : null}
      {adding ? form() : null}
      {editing ? form(editing) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className={`card p-4 ${!s.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
                <ServiceIcon name={s.icon} className="h-5 w-5" />
              </span>
              <span className="flex gap-1">
                {s.isFeatured ? <span className="badge bg-amber-100 text-amber-800">Featured</span> : null}
                {!s.isActive ? <span className="badge bg-gray-200 text-gray-600">Inactive</span> : null}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-navy-900">{s.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.shortDesc}</p>
            <p className="mt-2 text-xs text-slate-400">Order: {s.displayOrder}{s.startingPrice ? ` · From ₹${s.startingPrice} ${s.priceUnit}` : ''}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setEditing(s); setAdding(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-outline btn-sm">Edit</button>
              <button
                onClick={() => confirm(`Delete "${s.name}"? If enquiries reference it, it will be deactivated instead.`) &&
                  start(async () => { await deleteService(s.id); router.refresh(); })}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
