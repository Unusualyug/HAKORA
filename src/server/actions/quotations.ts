'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { requireAdminOrThrow } from '@/lib/auth/guard';
import { nextRef } from '@/lib/refs';
import { generateAccessToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/auth/rate-limit';
import {
  computeTotals, quotationSnapshot, quoteRef, isQuotationPayable, type ItemInput,
} from '@/server/services/quotation';
import { razorpayConfigured, razorpayKeyId, createRazorpayOrder } from '@/lib/razorpay';
import { hashAccessToken, isValidTokenFormat } from '@/lib/tokens';
import { getSettings } from '@/lib/settings';
import { sendEmail, emailConfigured } from '@/lib/email';

const str = (v: FormDataEntryValue | null) => String(v ?? '').trim();
const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

function parseItems(formData: FormData): ItemInput[] {
  const raw = str(formData.get('itemsJson'));
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Invalid items'); }
  if (!Array.isArray(parsed)) throw new Error('Invalid items');
  const items = (parsed as Record<string, unknown>[]).slice(0, 25)
    .map((i) => ({
      kind: ['SERVICE', 'PRINTING', 'BINDING', 'DELIVERY', 'OTHER'].includes(String(i.kind)) ? String(i.kind) : 'OTHER',
      description: String(i.description ?? '').trim().slice(0, 300),
      quantity: Math.max(0, Number(i.quantity) || 0),
      unitPrice: Math.max(0, Number(i.unitPrice) || 0),
    }))
    .filter((i) => i.description && i.quantity > 0);
  if (!items.length) throw new Error('Add at least one line item');
  return items;
}

function quotationData(formData: FormData) {
  const items = parseItems(formData);
  const discount = Math.max(0, num(formData.get('discount')));
  const taxRate = Math.min(28, Math.max(0, num(formData.get('taxRate'))));
  const advanceType = (['FULL', 'PERCENT', 'FIXED'].includes(str(formData.get('advanceType')))
    ? str(formData.get('advanceType')) : 'FULL') as 'FULL' | 'PERCENT' | 'FIXED';
  const advanceValue = Math.max(0, num(formData.get('advanceValue')));
  const totals = computeTotals(items, discount, taxRate, advanceType, advanceValue);
  return {
    fields: {
      title: str(formData.get('title')) || 'Quotation',
      notes: str(formData.get('notes')) || null,
      paymentTerms: str(formData.get('paymentTerms')) || null,
      validUntil: str(formData.get('validUntil')) ? new Date(str(formData.get('validUntil')) + 'T23:59:59') : null,
      taxLabel: str(formData.get('taxLabel')) || 'GST',
      taxRate, discount,
      subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total,
      advanceType, advanceValue, advanceAmount: totals.advanceAmount,
    },
    lines: totals.lines,
  };
}

// ───────────────────────── Admin actions ─────────────────────────

export async function createQuotation(enquiryId: string | null, customerId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const { fields, lines } = quotationData(formData);
  const year = new Date().getFullYear();

  const quotation = await prisma.$transaction(async (tx) => {
    const n = await nextRef(tx, `quote-${year}`);
    const q = await tx.quotation.create({
      data: {
        quoteNo: quoteRef(year, n),
        customerId,
        enquiryId,
        ...fields,
        items: {
          create: lines.map((l, i) => ({
            kind: l.kind as never, description: l.description, quantity: l.quantity,
            unitPrice: l.unitPrice, lineTotal: l.lineTotal, sortOrder: i,
          })),
        },
      },
    });
    return q;
  });

  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'quotation.create', entity: 'Quotation', entityId: quotation.id },
  });
  revalidatePath('/admin/quotations');
  if (enquiryId) revalidatePath(`/admin/enquiries/${enquiryId}`);
  redirect(`/admin/quotations/${quotation.id}`);
}

export async function updateQuotation(quotationId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const existing = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId }, include: { items: true },
  });
  if (['PAID', 'CANCELLED', 'SUPERSEDED'].includes(existing.status)) {
    throw new Error('This quotation can no longer be edited.');
  }
  const { fields, lines } = quotationData(formData);

  await prisma.$transaction(async (tx) => {
    // snapshot current state as a revision whenever a sent quotation changes
    if (existing.status !== 'DRAFT') {
      await tx.quotationRevision.create({
        data: {
          quotationId,
          revisionNo: existing.revisionNo,
          snapshot: quotationSnapshot(existing as never) as never,
          reason: 'Revised by admin',
          adminId: admin.id,
        },
      });
    }
    await tx.quotationItem.deleteMany({ where: { quotationId } });
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        ...fields,
        revisionNo: existing.status !== 'DRAFT' ? existing.revisionNo + 1 : existing.revisionNo,
        items: {
          create: lines.map((l, i) => ({
            kind: l.kind as never, description: l.description, quantity: l.quantity,
            unitPrice: l.unitPrice, lineTotal: l.lineTotal, sortOrder: i,
          })),
        },
      },
    });
  });

  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'quotation.update', entity: 'Quotation', entityId: quotationId },
  });
  revalidatePath(`/admin/quotations/${quotationId}`);
  revalidatePath('/admin/quotations');
}

/** Generate (or rotate) the secure portal link. Returns the full URL — shown once. */
export async function issueQuotationLink(quotationId: string): Promise<{ url: string }> {
  const admin = await requireAdminOrThrow();
  const q = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId }, include: { customer: true },
  });
  if (['CANCELLED', 'SUPERSEDED', 'PAID'].includes(q.status)) throw new Error('Quotation is not sendable.');

  const { token, hash } = generateAccessToken();
  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      tokenHash: hash,
      status: q.status === 'DRAFT' ? 'SENT' : q.status,
      sentAt: q.sentAt ?? new Date(),
    },
  });
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'quotation.issue_link', entity: 'Quotation', entityId: quotationId },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${base}/q/${token}`;

  // optional email notification to the student
  if (emailConfigured() && q.customer.email) {
    const settings = await getSettings();
    void sendEmail(
      q.customer.email,
      `${settings.businessName} — Quotation ${q.quoteNo}`,
      `<p>Hello ${q.customer.fullName},</p><p>Your quotation <strong>${q.quoteNo}</strong> (${q.title}) is ready.</p><p><a href="${url}">View and pay securely here</a>.</p><p>— ${settings.businessName}</p>`,
    );
  }

  revalidatePath(`/admin/quotations/${quotationId}`);
  return { url };
}

export async function setQuotationStatus(quotationId: string, status: 'CANCELLED' | 'EXPIRED' | 'SUPERSEDED') {
  const admin = await requireAdminOrThrow();
  await prisma.quotation.update({ where: { id: quotationId }, data: { status } });
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: `quotation.${status.toLowerCase()}`, entity: 'Quotation', entityId: quotationId },
  });
  revalidatePath(`/admin/quotations/${quotationId}`);
  revalidatePath('/admin/quotations');
}

export async function recordQuotationRefund(paymentId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const amount = Math.max(0, num(formData.get('amount')));
  const reason = str(formData.get('reason'));
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== 'SUCCESS' && payment.status !== 'PARTIALLY_REFUNDED') {
    throw new Error('Only successful payments can be refunded.');
  }
  const alreadyRefunded = Number(payment.refundedAmount);
  const maxRefundable = Number(payment.amount) - alreadyRefunded;
  if (amount <= 0 || amount > maxRefundable + 0.01) throw new Error(`Refund must be between ₹1 and ₹${maxRefundable}`);

  let gatewayRefundId: string | null = null;
  if (payment.gateway === 'RAZORPAY' && payment.gatewayPaymentId && razorpayConfigured()) {
    const { createRazorpayRefund } = await import('@/lib/razorpay');
    const r = await createRazorpayRefund(payment.gatewayPaymentId, amount);
    gatewayRefundId = r.id;
  }

  const newRefunded = alreadyRefunded + amount;
  await prisma.$transaction([
    prisma.refund.create({
      data: { paymentId, amount, gatewayRefundId, reason: reason || null, status: 'PROCESSED' },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount: newRefunded,
        status: newRefunded >= Number(payment.amount) - 0.01 ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    }),
  ]);
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'payment.refund', entity: 'Payment', entityId: paymentId, meta: { amount } },
  });
  revalidatePath('/admin/payments');
}

// ───────────────────────── Public portal actions ─────────────────────────

async function quotationByToken(token: string) {
  if (!isValidTokenFormat(token)) return null;
  return prisma.quotation.findUnique({
    where: { tokenHash: hashAccessToken(token) },
    include: { customer: true, items: { orderBy: { sortOrder: 'asc' } }, acceptance: true, payments: true },
  });
}

export async function acceptQuotation(token: string): Promise<{ ok: boolean; message: string }> {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`qaccept:${ip}`, 20, 10 * 60 * 1000)) return { ok: false, message: 'Too many attempts. Try again later.' };

  const q = await quotationByToken(token);
  if (!q) return { ok: false, message: 'Quotation not found.' };
  const payable = isQuotationPayable(q);
  if (!payable.ok) return { ok: false, message: payable.reason! };
  if (q.acceptance) return { ok: true, message: 'Quotation already accepted.' };

  await prisma.$transaction([
    prisma.quotationAcceptance.create({
      data: {
        quotationId: q.id,
        acceptorIp: ip,
        userAgent: headers().get('user-agent')?.slice(0, 250) ?? null,
      },
    }),
    prisma.quotation.update({
      where: { id: q.id },
      data: { status: ['SENT', 'VIEWED'].includes(q.status) ? 'ACCEPTED' : q.status },
    }),
    prisma.notification.create({
      data: {
        type: 'quotation_accepted',
        title: `Quotation ${q.quoteNo} accepted`,
        body: `${q.customer.fullName} accepted "${q.title}" (₹${Number(q.total).toLocaleString('en-IN')}).`,
        link: `/admin/quotations/${q.id}`,
      },
    }),
    prisma.auditLog.create({
      data: { action: 'quotation.accepted', entity: 'Quotation', entityId: q.id, meta: { ip } },
    }),
  ]);
  return { ok: true, message: 'Quotation accepted! You can now proceed to payment.' };
}

export type PayOrderResult =
  | { ok: true; keyId: string; gatewayOrderId: string; amount: number; name: string; description: string; prefillName: string; prefillContact: string }
  | { ok: false; message: string };

/** Create a Razorpay order server-side for either the advance or the full balance. */
export async function createPaymentOrder(token: string, mode: 'advance' | 'full'): Promise<PayOrderResult> {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`qpay:${ip}`, 15, 10 * 60 * 1000)) return { ok: false, message: 'Too many attempts. Try again later.' };

  if (!razorpayConfigured()) {
    return { ok: false, message: 'Online payment is not available right now. Please contact us on WhatsApp to pay.' };
  }

  const q = await quotationByToken(token);
  if (!q) return { ok: false, message: 'Quotation not found.' };
  const payable = isQuotationPayable(q);
  if (!payable.ok) return { ok: false, message: payable.reason! };

  const paid = q.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, Number(q.total) - paid);
  if (balance <= 0) return { ok: false, message: 'This quotation is already fully paid.' };

  let amount = balance;
  if (mode === 'advance' && paid === 0 && q.advanceType !== 'FULL') {
    amount = Math.min(balance, Number(q.advanceAmount));
  }
  if (amount < 1) return { ok: false, message: 'Amount too small for online payment.' };

  // Re-use an existing pending gateway order of the same amount to avoid duplicates
  const pending = q.payments.find((p) => p.status === 'PENDING' && Number(p.amount) === amount && p.gatewayOrderId);
  if (pending?.gatewayOrderId) {
    const settings = await getSettings();
    return {
      ok: true, keyId: razorpayKeyId(), gatewayOrderId: pending.gatewayOrderId, amount: Math.round(amount * 100),
      name: settings.businessName, description: `${q.quoteNo} — ${q.title}`.slice(0, 120),
      prefillName: q.customer.fullName, prefillContact: `+91${q.customer.mobile}`,
    };
  }

  const rzpOrder = await createRazorpayOrder(amount, q.quoteNo, { quoteNo: q.quoteNo, quotationId: q.id });
  await prisma.payment.create({
    data: {
      quotationId: q.id,
      customerId: q.customerId,
      amount,
      gateway: 'RAZORPAY',
      method: 'OTHER',
      status: 'PENDING',
      gatewayOrderId: rzpOrder.id,
      notes: mode === 'advance' ? 'Advance payment' : 'Full/balance payment',
    },
  });

  const settings = await getSettings();
  return {
    ok: true, keyId: razorpayKeyId(), gatewayOrderId: rzpOrder.id, amount: rzpOrder.amount,
    name: settings.businessName, description: `${q.quoteNo} — ${q.title}`.slice(0, 120),
    prefillName: q.customer.fullName, prefillContact: `+91${q.customer.mobile}`,
  };
}
