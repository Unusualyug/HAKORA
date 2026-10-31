import 'server-only';
import { prisma } from '@/lib/db';

export type SiteSettings = {
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  contactPhone: string;
  businessEmail: string;
  businessAddress: string;
  serviceArea: string;
  businessHours: string;
  heroHeading: string;
  heroSubtext: string;
  aboutContent: string;
  footerNote: string;
  socialInstagram: string;
  socialFacebook: string;
  socialLinkedin: string;
  privacyPolicy: string;
  terms: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: process.env.BUSINESS_NAME || 'HAKORA',
  tagline: 'Your Academic Partner.',
  whatsappNumber: process.env.BUSINESS_WHATSAPP || '919825751614',
  contactPhone: '+91 98257 51614',
  businessEmail: 'hello@hakora.in',
  businessAddress: 'Ahmedabad, Gujarat, India',
  serviceArea: 'Ahmedabad & Gandhinagar (campus delivery available)',
  businessHours: 'Mon–Sat: 9:00 AM – 9:00 PM, Sun: 10:00 AM – 6:00 PM',
  heroHeading: 'Your Academic Work, Made Easier.',
  heroSubtext:
    'From academic document preparation to printing and doorstep delivery, get all your student requirements handled in one place.',
  aboutContent:
    'HAKORA is your trusted partner for academic document assistance and printing services. We make academic and printing requirements easier by providing a convenient platform where students can submit their requirements and receive personalized assistance.\n\nWhether you need a single document prepared, an assignment formatted, a lab manual printed or hundreds of pages delivered, HAKORA is here to help.',
  footerNote: 'Simple Process • Personal Assistance • Convenient Delivery',
  socialInstagram: '',
  socialFacebook: '',
  socialLinkedin: '',
  privacyPolicy: '',
  terms: '',
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    const row = await prisma.websiteSettings.findUnique({ where: { id: 'singleton' } });
    const data = (row?.data ?? {}) as Partial<SiteSettings>;
    return { ...DEFAULT_SETTINGS, ...data };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<SiteSettings>) {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  await prisma.websiteSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', data: merged },
    update: { data: merged },
  });
  return merged;
}
