import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };
export const dynamic = "force-dynamic";

export default async function RefundPolicyPage() {
  const s = await getSettings();
  return (
    <div className="container-site max-w-3xl py-14">
      <h1 className="text-3xl font-bold text-navy-950">
        Refund &amp; Cancellation Policy
      </h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
        <p>
          {s.businessName} provides personalised academic assistance, document
          preparation, printing and delivery services. Because every order is
          custom-made for the individual student, our refund and cancellation
          terms are as follows.
        </p>
        <p>
          <strong className="text-navy-900">Advance payments.</strong> To
          confirm an order, we collect an advance payment (or full payment) as
          specified in your quotation. The advance reserves our team&apos;s time
          and covers materials for your custom work.{" "}
          <strong className="text-navy-900">
            Once work on your order has started, the advance payment is
            non-refundable.
          </strong>
        </p>
        <p>
          <strong className="text-navy-900">
            Cancellation before work begins.
          </strong>{" "}
          If you wish to cancel, contact us on WhatsApp at +{s.whatsappNumber}{" "}
          as soon as possible. If our team has not yet started preparing or
          printing your order, we will cancel it and refund any amount paid,
          after deducting any payment-gateway charges incurred.
        </p>
        <p>
          <strong className="text-navy-900">
            No refunds after work has started.
          </strong>{" "}
          Payments for orders that are in preparation, printing, binding or out
          for delivery are non-refundable. Custom academic documents and printed
          material cannot be resold or reused, so completed or in-progress work
          cannot be returned.
        </p>
        <p>
          <strong className="text-navy-900">Our quality promise.</strong> If the
          delivered work does not match the specifications agreed in your
          quotation (e.g. wrong document, missing pages, incorrect binding),
          tell us within 48 hours of delivery. We will correct and redeliver the
          work at no extra cost. If we are unable to deliver your confirmed
          order at all, you will receive a full refund of the amount paid.
        </p>
        <p>
          <strong className="text-navy-900">
            Failed, duplicate or excess payments.
          </strong>{" "}
          If a payment fails but the amount is debited from your account, or if
          you are charged twice for the same order, the excess amount is
          refunded automatically or on request. Such refunds are processed to
          your original payment method within 5–7 working days of verification.
        </p>
        <p>
          <strong className="text-navy-900">How refunds are processed.</strong>{" "}
          All eligible refunds are issued to the original payment method (UPI,
          card or bank account) through our payment gateway. Depending on your
          bank, the amount may take 5–7 working days to reflect after the refund
          is initiated.
        </p>
        <p>
          <strong className="text-navy-900">Contact.</strong> For any
          cancellation or refund request, reach us on WhatsApp at +
          {s.whatsappNumber} or email {s.businessEmail}. Please keep your order
          reference (e.g. CS-2026-0001) or quotation number (e.g. HQ-2026-0001)
          handy so we can help you faster.
        </p>
      </div>
    </div>
  );
}
