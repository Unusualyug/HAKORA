'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const go = (p: number) => {
    const next = new URLSearchParams(sp.toString());
    next.set('page', String(p));
    router.push(`${pathname}?${next.toString()}`);
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => go(page - 1)}>← Previous</button>
      <span className="text-slate-500">Page {page} of {pages}</span>
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => go(page + 1)}>Next →</button>
    </div>
  );
}
