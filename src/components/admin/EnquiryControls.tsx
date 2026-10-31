'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Archive, Download, Loader2, Search } from 'lucide-react';
import { bulkEnquiryAction, updateEnquiryStatus } from '@/server/actions/admin';
import { ENQUIRY_STATUSES, STATUS_LABELS } from '@/lib/constants';

export function EnquiryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');

  const apply = (params: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(params).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => { e.preventDefault(); apply({ q }); }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, mobile, ref, college…"
          className="input !w-64 !pl-9 !py-2"
        />
      </form>
      <select
        className="input !w-auto !py-2" value={sp.get('status') ?? ''}
        onChange={(e) => apply({ status: e.target.value })} aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <input
          type="checkbox" checked={sp.get('archived') === '1'}
          onChange={(e) => apply({ archived: e.target.checked ? '1' : '' })}
          className="h-4 w-4 rounded border-navy-300"
        />
        Archived
      </label>
      <a
        href={`/api/admin/export/enquiries?${sp.toString()}`}
        className="btn-outline btn-sm ml-auto"
      >
        <Download className="h-3.5 w-3.5" /> Export CSV
      </a>
    </div>
  );
}

export function BulkBar({ selected, onDone }: { selected: string[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!selected.length) return null;
  const run = (action: string) =>
    start(async () => {
      await bulkEnquiryAction(selected, action);
      onDone();
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-white">
      <span className="text-xs font-semibold">{selected.length} selected</span>
      <select
        className="rounded-lg bg-navy-800 px-2 py-1.5 text-xs" defaultValue=""
        onChange={(e) => e.target.value && run(e.target.value)} disabled={pending}
        aria-label="Bulk status"
      >
        <option value="" disabled>Set status…</option>
        {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      <button onClick={() => run('archive')} disabled={pending} className="btn-sm inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-1.5 text-xs hover:bg-navy-700">
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />} Archive
      </button>
    </div>
  );
}

export function StatusSelect({ enquiryId, current }: { enquiryId: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        className="input !w-auto !py-1.5 !text-xs" value={current} disabled={pending}
        onChange={(e) => start(async () => { await updateEnquiryStatus(enquiryId, e.target.value); router.refresh(); })}
        aria-label="Enquiry status"
      >
        {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
    </span>
  );
}
