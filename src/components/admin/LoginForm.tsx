'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Loader2, LogIn } from 'lucide-react';
import { adminLogin } from '@/server/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign In
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(adminLogin, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      ) : null}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" placeholder="admin@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••••" />
      </div>
      <SubmitButton />
    </form>
  );
}
