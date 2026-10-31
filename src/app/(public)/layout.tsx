import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AnalyticsTracker, ConsentBanner } from '@/components/public/Analytics';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { StructuredData } from '@/components/public/StructuredData';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { slug: true, name: true },
  });
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        brand={settings.businessName}
        tagline={settings.tagline}
        waHref={waLink(settings.whatsappNumber, WA_MESSAGES.visited(settings.businessName))}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} services={services} />
      <AnalyticsTracker />
      <ConsentBanner />
      <StructuredData settings={settings} />
    </div>
  );
}
