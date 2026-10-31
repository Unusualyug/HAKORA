'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import { markNotificationsRead } from '@/server/actions/admin';

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await markNotificationsRead(); router.refresh(); })}
      className="btn-outline btn-sm"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />} Mark all read
    </button>
  );
}
