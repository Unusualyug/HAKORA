'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BulkBar } from './EnquiryControls';
import { formatDateTime, truncate } from '@/lib/utils';

export type EnquiryRow = {
  id: string; refNo: string; name: string; mobile: string; college: string;
  service: string; summary: string; createdAt: string; status: string; waHref: string;
};

export function EnquiryTable({ rows }: { rows: EnquiryRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((r) => r.id));
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-3">
      <BulkBar selected={selected} onDone={() => setSelected([])} />
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[900px]">
          <thead>
            <tr>
              <th className="w-10"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Enquiry ID</th><th>Student</th><th>Mobile</th><th>College</th>
              <th>Service</th><th>Requirement</th><th>Submitted</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="py-14 text-center text-sm text-slate-400">No enquiries found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.refNo}`} /></td>
                <td><Link href={`/admin/enquiries/${r.id}`} className="font-semibold text-royal-600 hover:underline">{r.refNo}</Link></td>
                <td className="font-medium text-navy-900">{r.name}</td>
                <td className="whitespace-nowrap">{r.mobile}</td>
                <td>{truncate(r.college, 26)}</td>
                <td>{r.service || '—'}</td>
                <td className="max-w-[220px] text-slate-500">{truncate(r.summary, 60)}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <Link href={`/admin/enquiries/${r.id}`} className="btn-outline btn-sm">View</Link>
                    <a href={r.waHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#25D366]/10 p-1.5 text-[#128C4A] hover:bg-[#25D366]/20" title="WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </a>
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
