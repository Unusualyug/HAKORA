'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Archive, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import {
  addEnquiryNote, adminUploadFile, archiveEnquiry, createOrderFromEnquiry,
  deleteAttachment, deleteEnquiry, setEnquiryQuotation,
} from '@/server/actions/admin';

export function NoteForm({ enquiryId }: { enquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const body = ref.current?.value ?? '';
        if (!body.trim()) return;
        start(async () => {
          await addEnquiryNote(enquiryId, body);
          if (ref.current) ref.current.value = '';
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <textarea ref={ref} rows={2} className="input resize-y" placeholder="Add an internal note (only admins can see this)…" />
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add Note
      </button>
    </form>
  );
}

export function QuotationForm({ enquiryId, amount, notes }: { enquiryId: string; amount: string; notes: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { await setEnquiryQuotation(enquiryId, fd); setSaved(true); router.refresh(); });
      }}
      className="space-y-3"
    >
      <div>
        <label className="label">Quotation Amount (₹)</label>
        <input name="amount" type="number" min="0" step="0.01" defaultValue={amount} className="input" placeholder="0.00" />
      </div>
      <div>
        <label className="label">Quotation Notes</label>
        <textarea name="notes" rows={2} defaultValue={notes} className="input resize-y" placeholder="e.g. 60 pages B/W + spiral binding + delivery" />
      </div>
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Quotation
      </button>
      {saved && !pending ? <span className="ml-2 text-xs font-medium text-green-600">Saved ✓</span> : null}
    </form>
  );
}

export function CreateOrderForm({ enquiryId, defaults }:
  { enquiryId: string; defaults: { title: string; quantity: string; unitPrice: string } }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-royal btn-sm w-full">Convert to Order</button>;
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { await createOrderFromEnquiry(enquiryId, fd); });
      }}
      className="space-y-3 rounded-xl border border-royal-100 bg-royal-50/50 p-4"
    >
      <h4 className="text-sm font-bold text-navy-900">Create Order</h4>
      <div>
        <label className="label">Order Title</label>
        <input name="title" defaultValue={defaults.title} className="input" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Quantity</label><input name="quantity" type="number" min="1" defaultValue={defaults.quantity || '1'} className="input" /></div>
        <div><label className="label">Pages</label><input name="pages" type="number" min="0" className="input" placeholder="optional" /></div>
        <div><label className="label">Unit Price (₹)</label><input name="unitPrice" type="number" min="0" step="0.01" defaultValue={defaults.unitPrice} className="input" /></div>
        <div><label className="label">Delivery (₹)</label><input name="deliveryCharges" type="number" min="0" step="0.01" defaultValue="0" className="input" /></div>
        <div><label className="label">Extra Charges (₹)</label><input name="additionalCharges" type="number" min="0" step="0.01" defaultValue="0" className="input" /></div>
        <div><label className="label">Discount (₹)</label><input name="discount" type="number" min="0" step="0.01" defaultValue="0" className="input" /></div>
      </div>
      <div><label className="label">Expected Completion</label><input name="expectedCompletion" type="date" className="input" /></div>
      <div className="flex gap-2">
        <button disabled={pending} className="btn-royal btn-sm">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Create Order
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );
}

export function ArchiveDeleteButtons({ enquiryId, archived }: { enquiryId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(async () => { await archiveEnquiry(enquiryId, !archived); router.refresh(); })}
        className="btn-outline btn-sm"
      >
        <Archive className="h-3.5 w-3.5" /> {archived ? 'Unarchive' : 'Archive'}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm('Permanently delete this enquiry, its notes and attachments? This cannot be undone.')) {
            start(async () => { await deleteEnquiry(enquiryId); });
          }
        }}
        className="btn-danger btn-sm"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}

export function AdminFileUpload({ enquiryId }: { enquiryId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="btn-outline btn-sm cursor-pointer">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload file
      <input
        type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.append('file', f);
          start(async () => {
            try { await adminUploadFile(enquiryId, fd); } catch (err) { alert((err as Error).message); }
            router.refresh();
          });
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function DeleteAttachmentButton({ attachmentId }: { attachmentId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => confirm('Delete this file?') && start(async () => { await deleteAttachment(attachmentId); router.refresh(); })}
      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete file"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
