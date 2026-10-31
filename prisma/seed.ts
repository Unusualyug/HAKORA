/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SERVICES = [
  { name: 'Lab Manuals', icon: 'FlaskConical', shortDesc: 'Complete lab manual preparation, formatting and printing for all branches.', featured: true },
  { name: 'Assignments', icon: 'PenLine', shortDesc: 'Neatly prepared and formatted assignments, ready for submission.', featured: true },
  { name: 'Project Reports', icon: 'FolderKanban', shortDesc: 'Professional project report formatting, printing and binding.', featured: true },
  { name: 'Research Paper Formatting', icon: 'FileSearch', shortDesc: 'IEEE / APA / university-format research paper formatting.' },
  { name: 'Survey Paper Formatting', icon: 'ClipboardList', shortDesc: 'Survey paper structuring and formatting to your template.' },
  { name: 'Notes Printing', icon: 'NotebookPen', shortDesc: 'Print your class notes and study material at student-friendly rates.' },
  { name: 'Spiral Binding', icon: 'BookOpen', shortDesc: 'Durable spiral binding for manuals, notes and reports.' },
  { name: 'Document Printing', icon: 'Printer', shortDesc: 'Single and double-sided B/W or color document printing.' },
  { name: 'Bulk Printing', icon: 'Layers', shortDesc: 'Hundreds of pages? Get special bulk pricing and fast turnaround.', featured: true },
  { name: 'Photocopying', icon: 'Copy', shortDesc: 'Quick, clean photocopies of books, notes and documents.' },
  { name: 'Practical Files', icon: 'FileStack', shortDesc: 'Practical file preparation, printing and binding.' },
  { name: 'Custom Academic Requirements', icon: 'Sparkles', shortDesc: 'Something else? Describe any custom academic requirement.' },
];

const PRICING: Array<{ key: string; label: string; unit: string; price: number; category: string; sortOrder: number }> = [
  { key: 'bw_single_per_page', label: 'B/W printing — single side', unit: 'per page', price: 2, category: 'printing', sortOrder: 1 },
  { key: 'bw_double_per_page', label: 'B/W printing — double side', unit: 'per page', price: 1.5, category: 'printing', sortOrder: 2 },
  { key: 'color_single_per_page', label: 'Color printing — single side', unit: 'per page', price: 10, category: 'printing', sortOrder: 3 },
  { key: 'color_double_per_page', label: 'Color printing — double side', unit: 'per page', price: 8, category: 'printing', sortOrder: 4 },
  { key: 'photocopy_per_page', label: 'Photocopy', unit: 'per page', price: 1, category: 'printing', sortOrder: 5 },
  { key: 'spiral_binding', label: 'Spiral binding', unit: 'per copy', price: 40, category: 'binding', sortOrder: 6 },
  { key: 'hard_binding', label: 'Hard binding', unit: 'per copy', price: 150, category: 'binding', sortOrder: 7 },
  { key: 'soft_binding', label: 'Soft binding', unit: 'per copy', price: 60, category: 'binding', sortOrder: 8 },
  { key: 'staple', label: 'Stapling', unit: 'per copy', price: 5, category: 'binding', sortOrder: 9 },
  { key: 'delivery_campus', label: 'Campus delivery', unit: 'flat', price: 30, category: 'delivery', sortOrder: 10 },
  { key: 'delivery_city', label: 'City delivery', unit: 'flat', price: 60, category: 'delivery', sortOrder: 11 },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  // ── First administrator (environment-based, never public) ──
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? '';
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing) {
      await prisma.adminUser.create({
        data: { email, passwordHash, name: 'Administrator', role: 'OWNER' },
      });
      console.log(`✔ Admin user created: ${email}`);
    } else {
      console.log(`• Admin user already exists: ${email} (password unchanged)`);
    }
  } else {
    console.warn('! ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set — no admin created.');
  }

  // ── Services ──
  for (let i = 0; i < SERVICES.length; i++) {
    const s = SERVICES[i];
    await prisma.service.upsert({
      where: { slug: slugify(s.name) },
      create: {
        slug: slugify(s.name), name: s.name, shortDesc: s.shortDesc, icon: s.icon,
        displayOrder: i + 1, isFeatured: !!s.featured,
      },
      update: {},
    });
  }
  console.log(`✔ ${SERVICES.length} services ensured`);

  // ── Pricing rules ──
  for (const p of PRICING) {
    await prisma.pricingRule.upsert({
      where: { key: p.key },
      create: p,
      update: {},
    });
  }
  console.log(`✔ ${PRICING.length} pricing rules ensured`);

  // ── Settings singleton ──
  await prisma.websiteSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', data: {} },
    update: {},
  });
  console.log('✔ Settings row ensured');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
