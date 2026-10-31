import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Privacy Policy' };
export const dynamic = 'force-dynamic';

export default async function PrivacyPolicyPage() {
  const s = await getSettings();
  const custom = s.privacyPolicy?.trim();
  return (
    <div className="container-site max-w-3xl py-14">
      <h1 className="text-3xl font-bold text-navy-950">Privacy Policy</h1>
      {custom ? (
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
          {custom.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : (
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
          <p><strong className="text-navy-900">What we collect.</strong> When you submit a requirement or contact form, we collect the details you provide: your name, mobile number, school/college, requirement description, optional delivery address and any files you attach. We use this information only to respond to your enquiry and fulfil your order.</p>
          <p><strong className="text-navy-900">Analytics.</strong> We use anonymous, first-party analytics (page views, button clicks, device category) to improve the website. We do not identify anonymous visitors, fingerprint devices or collect precise location. You can decline analytics in the consent banner.</p>
          <p><strong className="text-navy-900">Files.</strong> Uploaded documents are stored privately and are accessible only to our team for fulfilling your requirement.</p>
          <p><strong className="text-navy-900">Sharing.</strong> We never sell your data. Information is shared only as needed to deliver your order (e.g. a delivery contact).</p>
          <p><strong className="text-navy-900">Retention & your rights.</strong> We retain enquiry data only as long as needed for business and legal purposes. To correct or delete your information, contact us at {s.businessEmail} or on WhatsApp — we will act on verified requests promptly.</p>
          <p><strong className="text-navy-900">Contact.</strong> {s.businessName}, {s.businessAddress}. Email: {s.businessEmail}.</p>
        </div>
      )}
    </div>
  );
}
