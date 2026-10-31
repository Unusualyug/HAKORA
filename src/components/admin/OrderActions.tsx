'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  recordPayment, updateOrder, updateOrderStatus, upsertDelivery, upsertPrintSpec,
} from '@/server/actions/admin';
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/constants';

export function OrderStatusSelect({ orderId, current }: { orderId: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        className="input !w-auto !py-1.5 !text-xs" value={current} disabled={pending}
        onChange={(e) => start(async () => { await updateOrderStatus(orderId, e.target.value); router.refresh(); })}
        aria-label="Order status"
      >
        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
    </span>
  );
}

function useFormSubmit(action: (fd: FormData) => Promise<void>) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await action(fd); setSaved(true); router.refresh(); }
      catch (err) { alert((err as Error).message); }
    });
  };
  return { pending, saved, onSubmit };
}

function SaveButton({ pending, saved, label = 'Save' }: { pending: boolean; saved: boolean; label?: string }) {
  return (
    <span className="flex items-center gap-2">
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {label}
      </button>
      {saved && !pending ? <span className="text-xs font-medium text-green-600">Saved ✓</span> : null}
    </span>
  );
}

export function OrderEditForm({ order }: { order: Record<string, string> }) {
  const { pending, saved, onSubmit } = useFormSubmit((fd) => updateOrder(order.id, fd));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="label">Title</label><input name="title" defaultValue={order.title} className="input" required /></div>
      <div><label className="label">Description</label><textarea name="description" rows={2} defaultValue={order.description} className="input resize-y" /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><label className="label">Service Type</label><input name="serviceType" defaultValue={order.serviceType} className="input" /></div>
        <div><label className="label">Quantity</label><input name="quantity" type="number" min="1" defaultValue={order.quantity} className="input" /></div>
        <div><label className="label">Pages</label><input name="pages" type="number" min="0" defaultValue={order.pages} className="input" /></div>
        <div><label className="label">Unit Price (₹)</label><input name="unitPrice" type="number" min="0" step="0.01" defaultValue={order.unitPrice} className="input" /></div>
        <div><label className="label">Extra Charges (₹)</label><input name="additionalCharges" type="number" min="0" step="0.01" defaultValue={order.additionalCharges} className="input" /></div>
        <div><label className="label">Delivery (₹)</label><input name="deliveryCharges" type="number" min="0" step="0.01" defaultValue={order.deliveryCharges} className="input" /></div>
        <div><label className="label">Discount (₹)</label><input name="discount" type="number" min="0" step="0.01" defaultValue={order.discount} className="input" /></div>
        <div><label className="label">Expected Completion</label><input name="expectedCompletion" type="date" defaultValue={order.expectedCompletion} className="input" /></div>
      </div>
      <div><label className="label">Internal Notes</label><textarea name="internalNotes" rows={2} defaultValue={order.internalNotes} className="input resize-y" /></div>
      <SaveButton pending={pending} saved={saved} label="Save Order" />
    </form>
  );
}

export function PaymentForm({ orderId }: { orderId: string }) {
  const { pending, saved, onSubmit } = useFormSubmit((fd) => recordPayment(orderId, fd));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Amount (₹)</label><input name="amount" type="number" min="1" step="0.01" className="input" required /></div>
        <div>
          <label className="label">Method</label>
          <select name="method" className="input">
            <option value="CASH">Cash</option><option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option><option value="OTHER">Other</option>
          </select>
        </div>
        <div><label className="label">Date</label><input name="paidAt" type="date" className="input" /></div>
        <div><label className="label">Reference</label><input name="reference" className="input" placeholder="UPI ref / receipt no." /></div>
      </div>
      <div><label className="label">Notes</label><input name="notes" className="input" placeholder="optional" /></div>
      <SaveButton pending={pending} saved={saved} label="Record Payment" />
    </form>
  );
}

export function PrintSpecForm({ orderId, spec }: { orderId: string; spec: Record<string, string> }) {
  const { pending, saved, onSubmit } = useFormSubmit((fd) => upsertPrintSpec(orderId, fd));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><label className="label">Documents</label><input name="documents" type="number" min="1" defaultValue={spec.documents || '1'} className="input" /></div>
        <div><label className="label">Pages / Doc</label><input name="pagesPerDoc" type="number" min="1" defaultValue={spec.pagesPerDoc || '1'} className="input" /></div>
        <div><label className="label">Copies</label><input name="copies" type="number" min="1" defaultValue={spec.copies || '1'} className="input" /></div>
        <div>
          <label className="label">Print Mode</label>
          <select name="printMode" defaultValue={spec.printMode || 'BLACK_WHITE'} className="input">
            <option value="BLACK_WHITE">Black &amp; White</option><option value="COLOR">Color</option><option value="MIXED">Mixed</option>
          </select>
        </div>
        <div>
          <label className="label">Sides</label>
          <select name="sides" defaultValue={spec.sides || 'SINGLE'} className="input">
            <option value="SINGLE">Single-sided</option><option value="DOUBLE">Double-sided</option>
          </select>
        </div>
        <div>
          <label className="label">Binding</label>
          <select name="bindingType" defaultValue={spec.bindingType || 'NONE'} className="input">
            <option value="NONE">None</option><option value="SPIRAL">Spiral</option>
            <option value="HARD">Hard</option><option value="SOFT">Soft</option><option value="STAPLE">Staple</option>
          </select>
        </div>
        <div><label className="label">Paper Size</label><input name="paperSize" defaultValue={spec.paperSize || 'A4'} className="input" /></div>
        <div><label className="label">Paper Quality</label><input name="paperQuality" defaultValue={spec.paperQuality || '70 GSM'} className="input" /></div>
        <div><label className="label">Printing Price (₹)</label><input name="printingPrice" type="number" min="0" step="0.01" defaultValue={spec.printingPrice || '0'} className="input" /></div>
        <div><label className="label">Binding Price (₹)</label><input name="bindingPrice" type="number" min="0" step="0.01" defaultValue={spec.bindingPrice || '0'} className="input" /></div>
        <div><label className="label">Delivery Price (₹)</label><input name="deliveryPrice" type="number" min="0" step="0.01" defaultValue={spec.deliveryPrice || '0'} className="input" /></div>
        <div><label className="label">Quoted Total (₹)</label><input name="quotedTotal" type="number" min="0" step="0.01" defaultValue={spec.quotedTotal || '0'} className="input" /></div>
      </div>
      <div><label className="label">Notes</label><input name="notes" defaultValue={spec.notes} className="input" /></div>
      <SaveButton pending={pending} saved={saved} label="Save Printing Spec" />
    </form>
  );
}

export function DeliveryForm({ orderId, delivery }: { orderId: string; delivery: Record<string, string> }) {
  const { pending, saved, onSubmit } = useFormSubmit((fd) => upsertDelivery(orderId, fd));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Contact Name</label><input name="contactName" defaultValue={delivery.contactName} className="input" required /></div>
        <div><label className="label">Mobile</label><input name="mobile" defaultValue={delivery.mobile} className="input" required /></div>
      </div>
      <div><label className="label">Address</label><textarea name="address" rows={2} defaultValue={delivery.address} className="input resize-y" required /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><label className="label">Landmark</label><input name="landmark" defaultValue={delivery.landmark} className="input" /></div>
        <div><label className="label">Area</label><input name="area" defaultValue={delivery.area} className="input" /></div>
        <div><label className="label">Fee (₹)</label><input name="fee" type="number" min="0" step="0.01" defaultValue={delivery.fee || '0'} className="input" /></div>
        <div><label className="label">Expected Date</label><input name="expectedDate" type="date" defaultValue={delivery.expectedDate} className="input" /></div>
      </div>
      <div><label className="label">Delivery Notes</label><input name="notes" defaultValue={delivery.notes} className="input" /></div>
      <SaveButton pending={pending} saved={saved} label="Save Delivery" />
    </form>
  );
}
