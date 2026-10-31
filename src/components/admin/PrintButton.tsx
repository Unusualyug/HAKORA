'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary btn-sm">
      <Printer className="h-3.5 w-3.5" /> Print / Save PDF
    </button>
  );
}
