'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CheckCircle2, CreditCard, Loader2, MessageCircle } from 'lucide-react';
import { acceptQuotation, createPaymentOrder } from '@/server/actions/quotations';
import { formatINR } from '@/lib/utils';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PortalActions({
  token, payable, accepted, balance, advanceAmount, waHref, brand,
}: {
  token: string; payable: boolean; accepted: boolean; balance: number;
  advanceAmount: number | null; waHref: string; brand: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const onAccept = () =>
    startTransition(async () => {
      const res = await acceptQuotation(token);
      setMessage({ ok: res.ok, text: res.message });
      router.refresh();
    });

  const pay = async (mode: 'advance' | 'full') => {
    setBusy(mode);
    setMessage(null);
    try {
      const res = await createPaymentOrder(token, mode);
      if (!res.ok) {
        setMessage({ ok: false, text: res.message });
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setMessage({ ok: false, text: 'Could not load the payment window. Check your connection and try again.' });
        return;
      }
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.gatewayOrderId,
        amount: res.amount,
        currency: 'INR',
        name: res.name,
        description: res.description,
        prefill: { name: res.prefillName, contact: res.prefillContact },
        theme: { color: '#1a2b4a' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Server-side signature verification — the redirect alone is never trusted
          setBusy('verify');
          try {
            const verify = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const data = await verify.json();
            if (data.ok) {
              setMessage({ ok: true, text: 'Payment successful! Your order is confirmed. A receipt has been recorded.' });
            } else {
              setMessage({ ok: false, text: 'We received your payment but could not verify it instantly. It will be confirmed automatically — contact us on WhatsApp if anything looks wrong.' });
            }
          } finally {
            setBusy(null);
            router.refresh();
          }
        },
        modal: { ondismiss: () => { setBusy(null); setMessage({ ok: false, text: 'Payment was cancelled. You can retry anytime while the quotation is valid.' }); } },
      });
      rzp.on('payment.failed', () => {
        setBusy(null);
        setMessage({ ok: false, text: 'Payment failed. No money was captured — please try again or use another method.' });
        router.refresh();
      });
      rzp.open();
    } catch {
      setMessage({ ok: false, text: 'Something went wrong while starting the payment. Please try again.' });
    } finally {
      if (busy !== 'verify') setBusy(null);
    }
  };

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      {message ? (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${message.ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
          {message.text}
        </div>
      ) : null}

      {payable ? (
        <>
          {!accepted ? (
            <button onClick={onAccept} disabled={pending} className="btn-primary w-full !py-3.5 text-base">
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Accept Quotation
            </button>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Quotation accepted
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {advanceAmount ? (
              <button onClick={() => pay('advance')} disabled={busy !== null} className="btn-royal w-full !py-3.5 text-base">
                {busy === 'advance' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                Pay Advance {formatINR(advanceAmount)}
              </button>
            ) : null}
            <button
              onClick={() => pay('full')}
              disabled={busy !== null}
              className={`btn-royal w-full !py-3.5 text-base ${advanceAmount ? '!bg-navy-900 hover:!bg-navy-800' : 'sm:col-span-2'}`}
            >
              {busy === 'full' || busy === 'verify' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              {busy === 'verify' ? 'Verifying payment…' : <>Pay {advanceAmount ? 'Full ' : ''}{formatINR(balance)}</>}
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            Secure payment via Razorpay — UPI, cards, net banking & wallets. {brand} never sees your card or UPI details.
          </p>
        </>
      ) : null}

      <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full">
        <MessageCircle className="h-4 w-4" /> Questions? Chat with us on WhatsApp
      </a>
    </div>
  );
}
