'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Ban, Check, Copy, Link2, Loader2, MessageCircle, RotateCw } from 'lucide-react';
import { issueQuotationLink, setQuotationStatus } from '@/server/actions/quotations';

export function SendPanel({ quotationId, hasLink, waBase, customerName, quoteNo, brand }:
  { quotationId: string; hasLink: boolean; waBase: string; customerName: string; quoteNo: string; brand: string }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const issue = () =>
    start(async () => {
      try {
        const res = await issueQuotationLink(quotationId);
        setUrl(res.url);
        router.refresh();
      } catch (e) { alert((e as Error).message); }
    });

  const waHref = url
    ? `https://wa.me/${waBase}?text=${encodeURIComponent(
        `Hello ${customerName}, your quotation ${quoteNo} from ${brand} is ready. View it and pay securely here: ${url}`,
      )}`
    : null;

  return (
    <div className="space-y-3">
      <button onClick={issue} disabled={pending} className="btn-royal btn-sm w-full">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
        {hasLink ? 'Regenerate Secure Link' : 'Generate Secure Link & Mark Sent'}
      </button>
      {hasLink && !url ? (
        <p className="text-xs text-slate-400">
          A link is active. For security only its hash is stored — regenerate to get a fresh link (the old one stops working).
        </p>
      ) : null}
      {url ? (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-semibold text-green-800">Link ready — copy it now (shown only once):</p>
          <div className="flex items-center gap-2">
            <input readOnly value={url} className="input flex-1 !py-1.5 !text-xs" onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="btn-outline btn-sm shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm w-full">
              <MessageCircle className="h-3.5 w-3.5" /> Send via WhatsApp
            </a>
          ) : null}
          <p className="text-[11px] text-green-700">
            Opening WhatsApp pre-fills the message — it is sent only when you press send there.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function QuotationStatusButtons({ quotationId, status }: { quotationId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (s: 'CANCELLED' | 'EXPIRED' | 'SUPERSEDED', confirmText: string) => {
    if (!confirm(confirmText)) return;
    start(async () => { await setQuotationStatus(quotationId, s); router.refresh(); });
  };
  if (['PAID', 'CANCELLED', 'SUPERSEDED'].includes(status)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={() => act('CANCELLED', 'Cancel this quotation? The student link will stop accepting payment.')}
        className="btn-outline btn-sm"
      >
        <Ban className="h-3.5 w-3.5" /> Cancel
      </button>
      <button
        disabled={pending}
        onClick={() => act('SUPERSEDED', 'Mark as superseded (replaced by a newer quotation)?')}
        className="btn-outline btn-sm"
      >
        <RotateCw className="h-3.5 w-3.5" /> Supersede
      </button>
    </div>
  );
}
