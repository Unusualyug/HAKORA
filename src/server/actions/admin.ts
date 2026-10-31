'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import path from 'path';
import { prisma } from '@/lib/db';
import { requireAdminOrThrow } from '@/lib/auth/guard';
import { nextRef, orderRef } from '@/lib/refs';
import {
  ALLOWED_EXT, ALLOWED_MIME, MAX_FILE_BYTES, makeStorageKey, saveFile, deleteFile, STORAGE_MODE,
} from '@/lib/storage';
import { ENQUIRY_STATUSES, ORDER_STATUSES, DELIVERY_STATUSES } from '@/lib/constants';
import { slugify } from '@/lib/utils';
import { saveSettings, type SiteSettings } from '@/lib/settings';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

async function audit(adminId: string, action: string, entity?: string, entityId?: string, meta?: object) {
  await prisma.auditLog.create({
    data: { adminId, action, entity, entityId, meta: meta as never },
  });
}

const dec = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '0').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: FormDataEntryValue | null) => String(v ?? '').trim();

// ───────────────────────── Enquiries ─────────────────────────

export async function updateEnquiryStatus(enquiryId: string, status: string, note?: string) {
  const admin = await requireAdminOrThrow();
  if (!ENQUIRY_STATUSES.includes(status as never)) throw new Error('Invalid status');
  const enquiry = await prisma.enquiry.findUniqueOrThrow({ where: { id: enquiryId } });
  await prisma.$transaction([
    prisma.enquiry.update({ where: { id: enquiryId }, data: { status: status as never } }),
    prisma.enquiryStatusHistory.create({
      data: { enquiryId, fromStatus: enquiry.status, toStatus: status as never, adminId: admin.id, note: note || null },
    }),
  ]);
  await audit(admin.id, 'enquiry.status', 'Enquiry', enquiryId, { from: enquiry.status, to: status });
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath('/admin/enquiries');
  revalidatePath('/admin');
}

export async function addEnquiryNote(enquiryId: string, body: string) {
  const admin = await requireAdminOrThrow();
  const text = body.trim();
  if (!text) return;
  await prisma.enquiryNote.create({ data: { enquiryId, adminId: admin.id, body: text.slice(0, 3000) } });
  revalidatePath(`/admin/enquiries/${enquiryId}`);
}

export async function setEnquiryQuotation(enquiryId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { quotationAmount: dec(formData.get('amount')), quotationNotes: str(formData.get('notes')) || null },
  });
  await audit(admin.id, 'enquiry.quotation', 'Enquiry', enquiryId);
  revalidatePath(`/admin/enquiries/${enquiryId}`);
}

export async function archiveEnquiry(enquiryId: string, archived: boolean) {
  const admin = await requireAdminOrThrow();
  await prisma.enquiry.update({ where: { id: enquiryId }, data: { archived } });
  await audit(admin.id, archived ? 'enquiry.archive' : 'enquiry.unarchive', 'Enquiry', enquiryId);
  revalidatePath('/admin/enquiries');
}

export async function bulkEnquiryAction(ids: string[], action: string) {
  const admin = await requireAdminOrThrow();
  if (!ids.length) return;
  if (action === 'archive') {
    await prisma.enquiry.updateMany({ where: { id: { in: ids } }, data: { archived: true } });
  } else if (ENQUIRY_STATUSES.includes(action as never)) {
    for (const id of ids) {
      const e = await prisma.enquiry.findUnique({ where: { id } });
      if (!e) continue;
      await prisma.$transaction([
        prisma.enquiry.update({ where: { id }, data: { status: action as never } }),
        prisma.enquiryStatusHistory.create({
          data: { enquiryId: id, fromStatus: e.status, toStatus: action as never, adminId: admin.id, note: 'Bulk update' },
        }),
      ]);
    }
  }
  await audit(admin.id, `enquiry.bulk.${action}`, 'Enquiry', undefined, { count: ids.length });
  revalidatePath('/admin/enquiries');
}

export async function deleteEnquiry(enquiryId: string) {
  const admin = await requireAdminOrThrow();
  const attachments = await prisma.enquiryAttachment.findMany({ where: { enquiryId } });
  for (const a of attachments) await deleteFile(a.storedKey).catch(() => {});
  await prisma.enquiry.delete({ where: { id: enquiryId } });
  await audit(admin.id, 'enquiry.delete', 'Enquiry', enquiryId);
  revalidatePath('/admin/enquiries');
  redirect('/admin/enquiries');
}

// ───────────────────────── Customers ─────────────────────────

export async function updateCustomer(customerId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const schema = z.object({
    fullName: z.string().trim().min(2).max(120),
    college: z.string().trim().max(200).optional(),
    department: z.string().trim().max(120).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    notes: z.string().trim().max(3000).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Invalid customer data');
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      fullName: parsed.data.fullName,
      college: parsed.data.college || null,
      department: parsed.data.department || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    },
  });
  await audit(admin.id, 'customer.update', 'Customer', customerId);
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function toggleRegularCustomer(customerId: string, isRegular: boolean) {
  const admin = await requireAdminOrThrow();
  await prisma.customer.update({ where: { id: customerId }, data: { isRegular } });
  await audit(admin.id, 'customer.regular', 'Customer', customerId, { isRegular });
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath('/admin/customers');
}

// ───────────────────────── Orders ─────────────────────────

export async function createOrderFromEnquiry(enquiryId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const enquiry = await prisma.enquiry.findUniqueOrThrow({
    where: { id: enquiryId }, include: { customer: true },
  });
  const year = new Date().getFullYear();
  const title = str(formData.get('title')) || `Order for ${enquiry.refNo}`;
  const unitPrice = dec(formData.get('unitPrice'));
  const quantity = Math.max(1, Math.round(dec(formData.get('quantity')) || 1));
  const deliveryCharges = dec(formData.get('deliveryCharges'));
  const additionalCharges = dec(formData.get('additionalCharges'));
  const discount = dec(formData.get('discount'));
  const total = unitPrice * quantity + additionalCharges + deliveryCharges - discount;

  const order = await prisma.$transaction(async (tx) => {
    const n = await nextRef(tx, `order-${year}`);
    const o = await tx.order.create({
      data: {
        orderNo: orderRef(year, n),
        customerId: enquiry.customerId,
        enquiryId,
        title,
        description: str(formData.get('description')) || enquiry.description,
        serviceType: enquiry.serviceCategory,
        quantity,
        pages: dec(formData.get('pages')) || null,
        unitPrice, additionalCharges, deliveryCharges, discount,
        totalAmount: Math.max(0, total),
        expectedCompletion: str(formData.get('expectedCompletion'))
          ? new Date(str(formData.get('expectedCompletion'))) : null,
      },
    });
    await tx.enquiry.update({ where: { id: enquiryId }, data: { status: 'CONFIRMED' } });
    await tx.enquiryStatusHistory.create({
      data: { enquiryId, fromStatus: enquiry.status, toStatus: 'CONFIRMED', adminId: admin.id, note: `Order ${o.orderNo} created` },
    });
    return o;
  });

  await audit(admin.id, 'order.create', 'Order', order.id, { from: enquiry.refNo });
  revalidatePath('/admin/orders');
  redirect(`/admin/orders/${order.id}`);
}

export async function updateOrder(orderId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const unitPrice = dec(formData.get('unitPrice'));
  const quantity = Math.max(1, Math.round(dec(formData.get('quantity')) || 1));
  const additionalCharges = dec(formData.get('additionalCharges'));
  const deliveryCharges = dec(formData.get('deliveryCharges'));
  const discount = dec(formData.get('discount'));
  await prisma.order.update({
    where: { id: orderId },
    data: {
      title: str(formData.get('title')),
      description: str(formData.get('description')) || null,
      serviceType: str(formData.get('serviceType')) || null,
      quantity,
      pages: dec(formData.get('pages')) || null,
      unitPrice, additionalCharges, deliveryCharges, discount,
      totalAmount: Math.max(0, unitPrice * quantity + additionalCharges + deliveryCharges - discount),
      expectedCompletion: str(formData.get('expectedCompletion'))
        ? new Date(str(formData.get('expectedCompletion'))) : null,
      internalNotes: str(formData.get('internalNotes')) || null,
    },
  });
  await audit(admin.id, 'order.update', 'Order', orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
}

export async function updateOrderStatus(orderId: string, status: string) {
  const admin = await requireAdminOrThrow();
  if (!ORDER_STATUSES.includes(status as never)) throw new Error('Invalid status');
  await prisma.order.update({ where: { id: orderId }, data: { status: status as never } });
  await audit(admin.id, 'order.status', 'Order', orderId, { to: status });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
}

export async function recordPayment(orderId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const amount = dec(formData.get('amount'));
  if (amount <= 0) throw new Error('Amount must be positive');
  const method = str(formData.get('method'));
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId, amount,
        method: (['CASH','UPI','BANK_TRANSFER','OTHER'].includes(method) ? method : 'CASH') as never,
        reference: str(formData.get('reference')) || null,
        notes: str(formData.get('notes')) || null,
        paidAt: str(formData.get('paidAt')) ? new Date(str(formData.get('paidAt'))) : new Date(),
      },
    });
    const sum = await tx.payment.aggregate({ where: { orderId, status: 'SUCCESS' }, _sum: { amount: true } });
    await tx.order.update({ where: { id: orderId }, data: { advancePaid: sum._sum.amount ?? 0 } });
  });
  await audit(admin.id, 'payment.record', 'Order', orderId, { amount, method });
  revalidatePath(`/admin/orders/${orderId}`);
}

// ───────────────────────── Printing ─────────────────────────

export async function upsertPrintSpec(orderId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const documents = Math.max(1, Math.round(dec(formData.get('documents')) || 1));
  const pagesPerDoc = Math.max(1, Math.round(dec(formData.get('pagesPerDoc')) || 1));
  const copies = Math.max(1, Math.round(dec(formData.get('copies')) || 1));
  const data = {
    documents, pagesPerDoc, copies,
    totalPages: documents * pagesPerDoc * copies,
    printMode: str(formData.get('printMode')) as never,
    sides: str(formData.get('sides')) as never,
    bindingType: str(formData.get('bindingType')) as never,
    paperSize: str(formData.get('paperSize')) || 'A4',
    paperQuality: str(formData.get('paperQuality')) || '70 GSM',
    printingPrice: dec(formData.get('printingPrice')),
    bindingPrice: dec(formData.get('bindingPrice')),
    deliveryPrice: dec(formData.get('deliveryPrice')),
    quotedTotal: dec(formData.get('quotedTotal')),
    notes: str(formData.get('notes')) || null,
  };
  await prisma.printingSpecification.upsert({
    where: { orderId },
    create: { orderId, ...data },
    update: data,
  });
  await audit(admin.id, 'printing.spec', 'Order', orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/printing');
}

export async function upsertPricingRule(formData: FormData) {
  const admin = await requireAdminOrThrow();
  const key = str(formData.get('key')) || slugify(str(formData.get('label')));
  if (!key) throw new Error('Key required');
  const data = {
    label: str(formData.get('label')),
    unit: str(formData.get('unit')) || 'per page',
    price: dec(formData.get('price')),
    category: str(formData.get('category')) || 'printing',
    isActive: formData.get('isActive') !== null,
    sortOrder: Math.round(dec(formData.get('sortOrder'))),
  };
  await prisma.pricingRule.upsert({ where: { key }, create: { key, ...data }, update: data });
  await audit(admin.id, 'pricing.upsert', 'PricingRule', key);
  revalidatePath('/admin/printing');
}

export async function deletePricingRule(key: string) {
  const admin = await requireAdminOrThrow();
  await prisma.pricingRule.delete({ where: { key } });
  await audit(admin.id, 'pricing.delete', 'PricingRule', key);
  revalidatePath('/admin/printing');
}

// ───────────────────────── Delivery ─────────────────────────

export async function upsertDelivery(orderId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const data = {
    contactName: str(formData.get('contactName')),
    mobile: str(formData.get('mobile')),
    address: str(formData.get('address')),
    landmark: str(formData.get('landmark')) || null,
    area: str(formData.get('area')) || null,
    fee: dec(formData.get('fee')),
    expectedDate: str(formData.get('expectedDate')) ? new Date(str(formData.get('expectedDate'))) : null,
    notes: str(formData.get('notes')) || null,
  };
  if (!data.contactName || !data.mobile || !data.address) throw new Error('Name, mobile and address are required');
  await prisma.delivery.upsert({ where: { orderId }, create: { orderId, ...data }, update: data });
  await audit(admin.id, 'delivery.upsert', 'Order', orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/deliveries');
}

export async function updateDeliveryStatus(deliveryId: string, status: string) {
  const admin = await requireAdminOrThrow();
  if (!DELIVERY_STATUSES.includes(status as never)) throw new Error('Invalid status');
  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: status as never, deliveredAt: status === 'DELIVERED' ? new Date() : null },
  });
  await audit(admin.id, 'delivery.status', 'Delivery', deliveryId, { to: status });
  revalidatePath('/admin/deliveries');
}

// ───────────────────────── Services ─────────────────────────

export async function upsertService(serviceId: string | null, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const name = str(formData.get('name'));
  if (!name) throw new Error('Name required');
  const data = {
    name,
    shortDesc: str(formData.get('shortDesc')),
    longDesc: str(formData.get('longDesc')) || null,
    icon: str(formData.get('icon')) || 'FileText',
    startingPrice: formData.get('startingPrice') ? dec(formData.get('startingPrice')) : null,
    priceUnit: str(formData.get('priceUnit')) || null,
    displayOrder: Math.round(dec(formData.get('displayOrder'))),
    isFeatured: formData.get('isFeatured') !== null,
    isActive: formData.get('isActive') !== null,
  };
  if (serviceId) {
    await prisma.service.update({ where: { id: serviceId }, data });
  } else {
    let slug = slugify(name);
    const clash = await prisma.service.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;
    await prisma.service.create({ data: { ...data, slug } });
  }
  await audit(admin.id, serviceId ? 'service.update' : 'service.create', 'Service', serviceId ?? name);
  revalidatePath('/admin/services');
  revalidatePath('/');
  revalidatePath('/services');
}

export async function deleteService(serviceId: string) {
  const admin = await requireAdminOrThrow();
  const linked = await prisma.enquiry.count({ where: { serviceId } });
  if (linked > 0) {
    await prisma.service.update({ where: { id: serviceId }, data: { isActive: false } });
  } else {
    await prisma.service.delete({ where: { id: serviceId } });
  }
  await audit(admin.id, 'service.delete', 'Service', serviceId);
  revalidatePath('/admin/services');
  revalidatePath('/');
}

// ───────────────────────── Reviews ─────────────────────────

export async function upsertReview(reviewId: string | null, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const data = {
    authorName: str(formData.get('authorName')),
    college: str(formData.get('college')) || null,
    rating: Math.min(5, Math.max(1, Math.round(dec(formData.get('rating')) || 5))),
    body: str(formData.get('body')),
    status: (str(formData.get('status')) || 'PENDING') as never,
    isFeatured: formData.get('isFeatured') !== null,
  };
  if (!data.authorName || !data.body) throw new Error('Author and review text required');
  if (reviewId) await prisma.review.update({ where: { id: reviewId }, data });
  else await prisma.review.create({ data: { ...data, source: 'admin' } });
  await audit(admin.id, reviewId ? 'review.update' : 'review.create', 'Review', reviewId ?? undefined);
  revalidatePath('/admin/reviews');
  revalidatePath('/');
}

export async function setReviewStatus(reviewId: string, status: string, isFeatured?: boolean) {
  const admin = await requireAdminOrThrow();
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: status as never, ...(isFeatured !== undefined ? { isFeatured } : {}) },
  });
  await audit(admin.id, 'review.status', 'Review', reviewId, { status });
  revalidatePath('/admin/reviews');
  revalidatePath('/');
}

export async function deleteReview(reviewId: string) {
  const admin = await requireAdminOrThrow();
  await prisma.review.delete({ where: { id: reviewId } });
  await audit(admin.id, 'review.delete', 'Review', reviewId);
  revalidatePath('/admin/reviews');
}

// ───────────────────────── Files ─────────────────────────

export async function adminUploadFile(enquiryId: string, formData: FormData) {
  const admin = await requireAdminOrThrow();
  const f = formData.get('file');
  if (!(f instanceof File) || f.size === 0) throw new Error('No file');
  const ext = path.extname(f.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(f.type)) throw new Error('File type not allowed');
  if (f.size > MAX_FILE_BYTES) throw new Error('File exceeds 10 MB');
  const key = makeStorageKey('admin-uploads', f.name);
  await saveFile(key, Buffer.from(await f.arrayBuffer()), f.type);
  await prisma.enquiryAttachment.create({
    data: {
      enquiryId, fileName: f.name, storedKey: key, mimeType: f.type,
      sizeBytes: f.size, storage: STORAGE_MODE, uploadedBy: 'admin',
    },
  });
  await audit(admin.id, 'file.upload', 'Enquiry', enquiryId, { fileName: f.name });
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath('/admin/files');
}

export async function deleteAttachment(attachmentId: string) {
  const admin = await requireAdminOrThrow();
  const att = await prisma.enquiryAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
  await deleteFile(att.storedKey).catch(() => {});
  await prisma.enquiryAttachment.delete({ where: { id: attachmentId } });
  await audit(admin.id, 'file.delete', 'EnquiryAttachment', attachmentId, { fileName: att.fileName });
  revalidatePath('/admin/files');
  revalidatePath(`/admin/enquiries/${att.enquiryId}`);
}

// ───────────────────────── Notifications ─────────────────────────

export async function markNotificationsRead(ids?: string[]) {
  await requireAdminOrThrow();
  await prisma.notification.updateMany({
    where: ids?.length ? { id: { in: ids } } : { isRead: false },
    data: { isRead: true },
  });
  revalidatePath('/admin/notifications');
  revalidatePath('/admin');
}

// ───────────────────────── Settings ─────────────────────────

export async function updateSettings(formData: FormData) {
  const admin = await requireAdminOrThrow();
  const patch: Partial<SiteSettings> = {};
  const keys: (keyof SiteSettings)[] = [
    'businessName','tagline','whatsappNumber','contactPhone','businessEmail','businessAddress',
    'serviceArea','businessHours','heroHeading','heroSubtext','aboutContent','footerNote',
    'socialInstagram','socialFacebook','socialLinkedin','privacyPolicy','terms',
  ];
  for (const k of keys) {
    const v = formData.get(k);
    if (v !== null) patch[k] = String(v).trim();
  }
  if (patch.whatsappNumber) patch.whatsappNumber = patch.whatsappNumber.replace(/\D/g, '');
  await saveSettings(patch);
  await audit(admin.id, 'settings.update', 'WebsiteSettings', 'singleton');
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
}

export async function changeAdminPassword(formData: FormData) {
  const admin = await requireAdminOrThrow();
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  if (next.length < 10) return { ok: false, message: 'New password must be at least 10 characters.' };
  const fresh = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(current, fresh.passwordHash))) {
    return { ok: false, message: 'Current password is incorrect.' };
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(next) },
  });
  await audit(admin.id, 'admin.password_change');
  return { ok: true, message: 'Password updated successfully.' };
}
