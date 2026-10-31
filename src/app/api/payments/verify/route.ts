import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { applySuccessfulPayment } from '@/server/services/quotation';
import { rateLimit } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Checkout success callback — the browser reports Razorpay's signed result here.
 * The signature is verified server-side with the key secret; the redirect itself
 * is NEVER trusted as proof of payment (the webhook independently confirms too).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`payverify:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: 'Too many attempts' }, { status: 429 });
  }

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ ok: false, message: 'Missing fields' }, { status: 400 });
  }

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ ok: false, message: 'Signature verification failed' }, { status: 400 });
  }

  const result = await applySuccessfulPayment({
    gatewayOrderId: razorpay_order_id,
    gatewayPaymentId: razorpay_payment_id,
    source: 'checkout',
  });

  // "already applied" (e.g. webhook arrived first) is still a success for the user
  if (result.applied || result.reason === 'already applied') {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: 'Payment could not be matched' }, { status: 400 });
}
