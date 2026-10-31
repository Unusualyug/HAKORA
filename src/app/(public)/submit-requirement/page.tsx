import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { RequirementForm } from '@/components/forms/RequirementForm';

export const metadata: Metadata = {
  title: 'Submit Your Requirement',
  description: 'Tell us what you need — assignments, lab manuals, project reports, printing, binding or delivery. We will contact you shortly.',
};
export const dynamic = 'force-dynamic';

export default async function SubmitRequirementPage({ searchParams }: { searchParams: { service?: string } }) {
  const settings = await getSettings();
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { name: true },
  });
  return (
    <div className="bg-navy-50/50">
      <div className="container-site max-w-3xl py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">Tell Us What You Need</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Need help with an assignment, lab manual, project report or printing order?
            Just explain your requirement. Our team will contact you.
          </p>
        </div>
        <div className="card mt-8 p-6 sm:p-8">
          <RequirementForm services={services.map((s) => s.name)} preselect={searchParams.service} brand={settings.businessName} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          No account needed. We only use your details to respond to this enquiry.
        </p>
      </div>
    </div>
  );
}
