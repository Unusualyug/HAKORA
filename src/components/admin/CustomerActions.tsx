'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Star } from 'lucide-react';
import { toggleRegularCustomer, updateCustomer } from '@/server/actions/admin';

export function RegularToggle({ customerId, isRegular }: { customerId: string; isRegular: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await toggleRegularCustomer(customerId, !isRegular); router.refresh(); })}
      className={isRegular ? 'btn-sm btn inline-flex bg-amber-100 text-amber-800 hover:bg-amber-200' : 'btn-outline btn-sm'}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className={`h-3.5 w-3.5 ${isRegular ? 'fill-current' : ''}`} />}
      {isRegular ? 'Regular customer' : 'Mark as regular'}
    </button>
  );
}

export function CustomerEditForm({ customer }:
  { customer: { id: string; fullName: string; college: string; department: string; email: string; notes: string } }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { await updateCustomer(customer.id, fd); setSaved(true); router.refresh(); });
      }}
      className="space-y-3"
    >
      <div><label className="label">Full Name</label><input name="fullName" defaultValue={customer.fullName} className="input" required /></div>
      <div><label className="label">College / School</label><input name="college" defaultValue={customer.college} className="input" /></div>
      <div><label className="label">Department</label><input name="department" defaultValue={customer.department} className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={customer.email} className="input" /></div>
      <div><label className="label">Customer Notes</label><textarea name="notes" rows={3} defaultValue={customer.notes} className="input resize-y" /></div>
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Changes
      </button>
      {saved && !pending ? <span className="ml-2 text-xs font-medium text-green-600">Saved ✓</span> : null}
    </form>
  );
}
