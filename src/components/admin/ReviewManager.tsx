'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Loader2, Plus, Star, Trash2, X, EyeOff } from 'lucide-react';
import { deleteReview, setReviewStatus, upsertReview } from '@/server/actions/admin';
import { StatusBadge } from '@/components/shared/StatusBadge';

export type ReviewRow = {
  id: string; authorName: string; college: string; rating: number; body: string;
  status: string; isFeatured: boolean; createdAt: string;
};

export function ReviewManager({ reviews }: { reviews: ReviewRow[] }) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const router = useRouter();

  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  const form = (r?: ReviewRow) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        act(async () => { await upsertReview(r?.id ?? null, fd); setAdding(false); setEditing(null); });
      }}
      className="card space-y-3 border-royal-200 p-5"
    >
      <h3 className="font-bold text-navy-900">{r ? 'Edit Review' : 'Add Review'}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Author</label><input name="authorName" defaultValue={r?.authorName} className="input" required /></div>
        <div><label className="label">College</label><input name="college" defaultValue={r?.college} className="input" /></div>
        <div>
          <label className="label">Rating</label>
          <select name="rating" defaultValue={r?.rating ?? 5} className="input">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Review Text</label><textarea name="body" rows={3} defaultValue={r?.body} className="input resize-y" required /></div>
      <div className="flex items-center gap-5">
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={r?.status ?? 'APPROVED'} className="input !w-auto">
            <option value="PENDING">Pending</option><option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option><option value="HIDDEN">Hidden</option>
          </select>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isFeatured" defaultChecked={r?.isFeatured} className="h-4 w-4 rounded" /> Featured
        </label>
      </div>
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save</button>
        <button type="button" onClick={() => { setAdding(false); setEditing(null); }} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      {!adding && !editing ? <button onClick={() => setAdding(true)} className="btn-royal btn-sm"><Plus className="h-3.5 w-3.5" /> Add Review</button> : null}
      {adding ? form() : null}
      {editing ? form(editing) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {reviews.length === 0 ? <p className="py-10 text-center text-sm text-slate-400 lg:col-span-2">No reviews yet. Add genuine customer feedback here.</p> : null}
        {reviews.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-900">{r.authorName}
                  {r.college ? <span className="ml-2 text-xs font-normal text-slate-400">{r.college}</span> : null}
                </p>
                <div className="mt-1 flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-current' : 'text-navy-100'}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={r.status} />
                {r.isFeatured ? <span className="badge bg-amber-100 text-amber-800">Featured</span> : null}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">“{r.body}”</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {r.status !== 'APPROVED' ? (
                <button onClick={() => act(() => setReviewStatus(r.id, 'APPROVED'))} className="btn-sm btn inline-flex bg-green-100 text-green-800 hover:bg-green-200"><Check className="h-3.5 w-3.5" /> Approve</button>
              ) : null}
              {r.status !== 'REJECTED' ? (
                <button onClick={() => act(() => setReviewStatus(r.id, 'REJECTED'))} className="btn-sm btn inline-flex bg-red-100 text-red-700 hover:bg-red-200"><X className="h-3.5 w-3.5" /> Reject</button>
              ) : null}
              {r.status !== 'HIDDEN' ? (
                <button onClick={() => act(() => setReviewStatus(r.id, 'HIDDEN'))} className="btn-outline btn-sm"><EyeOff className="h-3.5 w-3.5" /> Hide</button>
              ) : null}
              <button
                onClick={() => act(() => setReviewStatus(r.id, r.status, !r.isFeatured))}
                className="btn-outline btn-sm"
              >
                <Star className="h-3.5 w-3.5" /> {r.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
              <button onClick={() => setEditing(r)} className="btn-outline btn-sm">Edit</button>
              <button
                onClick={() => confirm('Delete this review?') && act(() => deleteReview(r.id))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
