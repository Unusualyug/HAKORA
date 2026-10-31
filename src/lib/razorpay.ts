import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay integration via REST API (no SDK dependency).
 * Configured entirely through server-side environment variables:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 */

export function razorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? '';
}

function authHeader() {
  const creds = `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/** Create a payment order on Razorpay (amount in INR, converted to paise). */
export async function createRazorpayOrder(
  amountInr: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<RazorpayOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Razorpay order creation failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Verify the checkout callback signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/** Verify a webhook body signature with the dedicated webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

/** Issue a refund through Razorpay (amount in INR). */
export async function createRazorpayRefund(gatewayPaymentId: string, amountInr: number) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}/refund`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amountInr * 100) }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Razorpay refund failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as { id: string; status: string };
}
