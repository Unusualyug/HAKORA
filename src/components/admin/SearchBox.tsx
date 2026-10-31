'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(sp.toString());
        if (q) next.set('q', q); else next.delete('q');
        next.delete('page');
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="relative max-w-md"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="input !pl-9" />
    </form>
  );
}
