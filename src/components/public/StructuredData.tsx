import type { SiteSettings } from '@/lib/settings';

export function StructuredData({ settings }: { settings: SiteSettings }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.businessName,
    description: settings.tagline,
    url: base,
    telephone: settings.contactPhone,
    email: settings.businessEmail,
    address: { '@type': 'PostalAddress', addressLocality: settings.businessAddress, addressCountry: 'IN' },
    areaServed: settings.serviceArea,
    priceRange: '₹₹',
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
