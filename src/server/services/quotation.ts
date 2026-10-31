import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextRef, orderRef } from "@/lib/refs";
import { sendEmail, emailConfigured } from "@/lib/email";
import { getSettings } from "@/lib/settings";

export function quoteRef(year: number, n: number) {
  return `HQ-${year}-${String(n).padStart(4, "0")}`;
}
export function invoiceRef(year: number, n: number) {
  return `HINV-${year}-${String(n).padStart(4, "0")}`;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export type ItemInput = {
  kind: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function computeTotals(
  items: ItemInput[],
  discount: number,
  taxRate: number,
  advanceType: "FULL" | "PERCENT" | "FIXED",
  advanceValue: number,
) {
  const lines = items.map((i) => ({
    ...i,
    lineTotal: r2(i.quantity * i.unitPrice),
  }));
  const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = r2((taxable * taxRate) / 100);
  const total = r2(taxable + taxAmount);
  let advanceAmount = total;
  if (advanceType === "PERCENT")
    advanceAmount = r2(
      (total * Math.min(100, Math.max(0, advanceValue))) / 100,
    );
  if (advanceType === "FIXED")
    advanceAmount = r2(Math.min(total, Math.max(0, advanceValue)));
  return { lines, subtotal, taxAmount, total, advanceAmount };
}

/** Serializable snapshot of a quotation for the revision history. */
export function quotationSnapshot(q: {
  title: string;
  notes: string | null;
  paymentTerms: string | null;
  validUntil: Date | null;
  taxLabel: string;
  taxRate: Prisma.Decimal;
  discount: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  advanceType: string;
  advanceValue: Prisma.Decimal;
  advanceAmount: Prisma.Decimal;
  status: string;
  items: {
    kind: string;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }[];
}) {
  return {
    title: q.title,
    notes: q.notes,
    paymentTerms: q.paymentTerms,
    validUntil: q.validUntil?.toISOString() ?? null,
    taxLabel: q.taxLabel,
    taxRate: q.taxRate.toString(),
    discount: q.discount.toString(),
    subtotal: q.subtotal.toString(),
    taxAmount: q.taxAmount.toString(),
    total: q.total.toString(),
    advanceType: q.advanceType,
    advanceValue: q.advanceValue.toString(),
    advanceAmount: q.advanceAmount.toString(),
    status: q.status,
    items: q.items.map((i) => ({
      kind: i.kind,
      description: i.description,
      quantity: i.quantity.toString(),
      unitPrice: i.unitPrice.toString(),
      lineTotal: i.lineTotal.toString(),
    })),
  };
}

export function isQuotationPayable(q: {
  status: string;
  validUntil: Date | null;
}): { ok: boolean; reason?: string } {
  if (["CANCELLED", "SUPERSEDED"].includes(q.status))
    return { ok: false, reason: "This quotation is no longer active." };
  if (q.status === "EXPIRED")
    return {
      ok: false,
      reason:
        "This quotation has expired. Please contact us for a fresh quote.",
    };
  if (q.status === "PAID")
    return { ok: false, reason: "This quotation is already fully paid." };
  if (q.status === "DRAFT")
    return { ok: false, reason: "This quotation is not yet available." };
  if (q.validUntil && q.validUntil < new Date())
    return {
      ok: false,
      reason:
        "This quotation has expired. Please contact us for a fresh quote.",
    };
  return { ok: true };
}

/**
 * Core workflow: a verified successful payment arrives (checkout callback OR webhook).
 * Idempotent — safe to call multiple times for the same gateway payment.
 * Marks the payment SUCCESS, updates the quotation, auto-creates/confirms the order,
 * issues an invoice/receipt and notifies the admin.
 */
export async function applySuccessfulPayment(opts: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewayMethod?: string;
  source: "checkout" | "webhook";
}): Promise<{ applied: boolean; reason?: string }> {
  const year = new Date().getFullYear();

  // Filled inside the transaction; used to send the receipt email after commit.
  type ReceiptInfo = {
    toEmail: string;
    customerName: string;
    quoteNo: string;
    title: string;
    invoiceNo: string;
    amountPaid: number;
    balance: number;
    fullyPaid: boolean;
    method: string;
    gatewayPaymentId: string;
  };
  let receipt: ReceiptInfo | null = null;

  const result = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { gatewayOrderId: opts.gatewayOrderId },
        include: {
          quotation: {
            include: { items: true, customer: true, enquiry: true },
          },
        },
      });
      if (!payment) return { applied: false, reason: "unknown gateway order" };

      // Idempotency: already applied?
      if (payment.status === "SUCCESS")
        return { applied: false, reason: "already applied" };

      const quotation = payment.quotation;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          gatewayPaymentId: opts.gatewayPaymentId,
          gatewayMethod: opts.gatewayMethod ?? null,
          paidAt: new Date(),
          notes: `verified via ${opts.source}`,
        },
      });

      if (quotation) {
        // total successful payments against this quotation (the aggregate runs
        // after this payment was marked SUCCESS above, so it is already included)
        const paidAgg = await tx.payment.aggregate({
          where: { quotationId: quotation.id, status: "SUCCESS" },
          _sum: { amount: true },
        });
        const alreadyPaid = Number(paidAgg._sum.amount ?? 0);
        const total = Number(quotation.total);
        const fullyPaid = alreadyPaid >= total - 0.01;
        // Required amount per the quotation's payment terms (full total or configured advance).
        const required =
          quotation.advanceType === "FULL"
            ? total
            : Math.min(Number(quotation.advanceAmount), total);
        const requiredMet = alreadyPaid >= required - 0.01;

        // ── auto-create / update the order ──
        let orderId = quotation.orderId;
        if (!orderId) {
          const n = await nextRef(tx, `order-${year}`);
          const order = await tx.order.create({
            data: {
              orderNo: orderRef(year, n),
              customerId: quotation.customerId,
              enquiryId: quotation.enquiryId,
              title: quotation.title,
              description: quotation.notes,
              serviceType: quotation.enquiry?.serviceCategory ?? null,
              status: requiredMet ? "CONFIRMED" : "PAYMENT_PENDING",
              quantity: 1,
              unitPrice: quotation.total,
              totalAmount: quotation.total,
              advancePaid: alreadyPaid,
              internalNotes: `Auto-created from quotation ${quotation.quoteNo} after online payment.`,
            },
          });
          orderId = order.id;
          await tx.quotation.update({
            where: { id: quotation.id },
            data: { orderId },
          });
          if (quotation.enquiryId) {
            await tx.enquiry.update({
              where: { id: quotation.enquiryId },
              data: { status: "CONFIRMED" },
            });
            await tx.enquiryStatusHistory.create({
              data: {
                enquiryId: quotation.enquiryId,
                fromStatus: "QUOTATION_SENT",
                toStatus: "CONFIRMED",
                note: `Online payment received for ${quotation.quoteNo}; order auto-created`,
              },
            });
          }
        } else {
          await tx.order.update({
            where: { id: orderId },
            data: {
              advancePaid: alreadyPaid,
              ...(requiredMet ? { status: "CONFIRMED" } : {}),
            },
          });
        }
        await tx.payment.update({
          where: { id: payment.id },
          data: { orderId },
        });

        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: fullyPaid ? "PAID" : "PARTIALLY_PAID" },
        });

        // ── invoice / receipt ──
        const invN = await nextRef(tx, `invoice-${year}`);
        const invoiceNo = invoiceRef(year, invN);
        await tx.invoice.create({
          data: {
            invoiceNo,
            customerId: quotation.customerId,
            quotationId: quotation.id,
            orderId,
            paymentId: payment.id,
            amount: payment.amount,
            data: {
              quoteNo: quotation.quoteNo,
              title: quotation.title,
              total: quotation.total.toString(),
              paid: payment.amount.toString(),
              balance: Math.max(0, total - alreadyPaid).toFixed(2),
              gatewayPaymentId: opts.gatewayPaymentId,
            },
          },
        });

        await tx.notification.create({
          data: {
            type: "payment_success",
            title: `Payment received: ₹${Number(payment.amount).toLocaleString("en-IN")} for ${quotation.quoteNo}`,
            body: `${quotation.customer.fullName} paid online (${opts.gatewayMethod ?? "gateway"}). ${fullyPaid ? "Quotation fully paid — order confirmed." : `Balance remaining: ₹${Math.max(0, total - alreadyPaid).toLocaleString("en-IN")}`}`,
            link: orderId
              ? `/admin/orders/${orderId}`
              : `/admin/quotations/${quotation.id}`,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "payment.gateway_success",
            entity: "Payment",
            entityId: payment.id,
            meta: {
              quoteNo: quotation.quoteNo,
              amount: payment.amount.toString(),
              source: opts.source,
            },
          },
        });

        // Queue the receipt email (sent after the transaction commits).
        if (quotation.customer.email) {
          receipt = {
            toEmail: quotation.customer.email,
            customerName: quotation.customer.fullName,
            quoteNo: quotation.quoteNo,
            title: quotation.title,
            invoiceNo,
            amountPaid: Number(payment.amount),
            balance: Math.max(0, total - alreadyPaid),
            fullyPaid,
            method: opts.gatewayMethod ?? "online",
            gatewayPaymentId: opts.gatewayPaymentId,
          };
        }
      }

      return { applied: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // ── payment receipt email to the customer (outside the transaction so a
  //    retry can never double-send, and a slow SMTP server can never block
  //    or fail the payment flow) ──
  if (result.applied && receipt && emailConfigured()) {
    const r = receipt as ReceiptInfo;
    try {
      const settings = await getSettings();
      const inr = (n: number) =>
        `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:#0f172a;color:#ffffff;padding:20px 24px">
            <h2 style="margin:0;font-size:20px">${settings.businessName}</h2>
            <p style="margin:4px 0 0;font-size:13px;color:#cbd5e1">Payment Receipt</p>
          </div>
          <div style="padding:24px">
            <p style="margin:0 0 16px">Hello ${r.customerName},</p>
            <p style="margin:0 0 16px">We have received your payment. Thank you!</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b">Receipt No.</td><td style="padding:6px 0;text-align:right"><strong>${r.invoiceNo}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Quotation</td><td style="padding:6px 0;text-align:right">${r.quoteNo} — ${r.title}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Amount Paid</td><td style="padding:6px 0;text-align:right"><strong style="color:#16a34a">${inr(r.amountPaid)}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Payment Method</td><td style="padding:6px 0;text-align:right">${r.method}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Payment ID</td><td style="padding:6px 0;text-align:right">${r.gatewayPaymentId}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right">${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
              <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px;font-size:14px">
                ${
                  r.fullyPaid
                    ? '<strong style="color:#16a34a">Fully paid — your order is confirmed. We will start working on it right away.</strong>'
                    : `Balance remaining: <strong>${inr(r.balance)}</strong> (payable as per your quotation terms)`
                }
              </td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:13px;color:#64748b">
              Questions? WhatsApp us at +${settings.whatsappNumber} or reply to this email.<br/>
              — Team ${settings.businessName}
            </p>
          </div>
        </div>`;
      void sendEmail(
        r.toEmail,
        `${settings.businessName} — Payment Receipt ${r.invoiceNo} (${inr(r.amountPaid)})`,
        html,
      );
    } catch {
      // Email must never break the payment flow.
    }
  }

  return { applied: result.applied, reason: result.reason };
}

export async function markPaymentFailed(
  gatewayOrderId: string,
  reason: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { gatewayOrderId },
    include: { quotation: { include: { customer: true } } },
  });
  if (!payment || payment.status !== "PENDING") return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", failureReason: reason.slice(0, 300) },
  });
  await prisma.notification.create({
    data: {
      type: "payment_failed",
      title: `Payment failed for ${payment.quotation?.quoteNo ?? "quotation"}`,
      body: `${payment.quotation?.customer.fullName ?? "Customer"} — ₹${Number(payment.amount).toLocaleString("en-IN")} (${reason.slice(0, 120)})`,
      link: payment.quotationId
        ? `/admin/quotations/${payment.quotationId}`
        : null,
    },
  });
}
