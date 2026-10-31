import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { applySuccessfulPayment, markPaymentFailed } from '@/server/services/quotation';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook — the authoritative source of payment truth.
 * - Signature verified with RAZORPAY_WEBHOOK_SECRET
 * - Idempotent via the unique PaymentWebhookEvent.eventId
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string; error_description?: string } } };
  };
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const eventId = req.headers.get('x-razorpay-event-id') ?? `${event.event}:${event.payload?.payment?.entity?.id ?? 'unknown'}`;
  const type = event.event ?? 'unknown';

  // idempotency — first writer wins, duplicates are acknowledged without reprocessing
  try {
    await prisma.paymentWebhookEvent.create({
      data: { eventId, type, payload: event as never },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const p = event.payload?.payment?.entity;
    if (type === 'payment.captured' && p?.order_id && p.id) {
      await applySuccessfulPayment({
        gatewayOrderId: p.order_id,
        gatewayPaymentId: p.id,
        gatewayMethod: p.method,
        source: 'webhook',
      });
    } else if (type === 'payment.failed' && p?.order_id) {
      await markPaymentFailed(p.order_id, p.error_description ?? 'Payment failed at gateway');
    } else {
      await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { status: 'skipped' } });
    }
  } catch (e) {
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: 'error', error: (e as Error).message.slice(0, 500) },
    }).catch(() => {});
    // 200 so Razorpay doesn't retry forever on a poison event; error is logged for admin review
  }

  return NextResponse.json({ ok: true });
}
