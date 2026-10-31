import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Terms and Conditions' };
export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const s = await getSettings();
  const custom = s.terms?.trim();
  return (
    <div className="container-site max-w-3xl py-14">
      <h1 className="text-3xl font-bold text-navy-950">Terms and Conditions</h1>
      {custom ? (
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
          {custom.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : (
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
          <p><strong className="text-navy-900">Service.</strong> {s.businessName} provides academic document assistance, printing, binding and delivery services. Submitting an enquiry is free and does not create an order; orders are confirmed only after you approve a quotation.</p>
          <p><strong className="text-navy-900">Quotations & payment.</strong> Prices are quoted per requirement. Payment terms (advance/balance) are agreed before work begins. Accepted methods include cash, UPI and bank transfer.</p>
          <p><strong className="text-navy-900">Academic integrity.</strong> Our assistance services support formatting, preparation and printing of your academic material. You are responsible for ensuring submissions comply with your institution&apos;s academic policies.</p>
          <p><strong className="text-navy-900">Delivery.</strong> Delivery timelines are estimates. We will inform you promptly of any delays.</p>
          <p><strong className="text-navy-900">Content.</strong> You confirm that documents you share do not infringe copyright and are lawful to print and reproduce.</p>
          <p><strong className="text-navy-900">Contact.</strong> Questions about these terms: {s.businessEmail}.</p>
        </div>
      )}
    </div>
  );
}
