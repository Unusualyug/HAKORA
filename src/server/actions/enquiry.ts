'use server';

import { headers } from 'next/headers';
import path from 'path';
import { prisma } from '@/lib/db';
import { enquirySchema } from '@/lib/validation/enquiry';
import { nextRef, enquiryRef, customerRef } from '@/lib/refs';
import { rateLimit } from '@/lib/auth/rate-limit';
import {
  ALLOWED_EXT, ALLOWED_MIME, MAX_FILES, MAX_FILE_BYTES,
  makeStorageKey, saveFile, STORAGE_MODE,
} from '@/lib/storage';

export type SubmitResult =
  | { ok: true; refNo: string }
  | { ok: false; errors: Record<string, string>; message?: string };

export async function submitEnquiry(formData: FormData): Promise<SubmitResult> {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`enquiry:${ip}`, 8, 10 * 60 * 1000)) {
    return { ok: false, errors: {}, message: 'Too many submissions. Please try again in a few minutes.' };
  }

  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(([, v]) => typeof v === 'string'),
  ) as Record<string, string>;

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const k = String(i.path[0] ?? 'form');
      if (!errors[k]) errors[k] = i.message;
    });
    return { ok: false, errors };
  }
  const d = parsed.data;
  if (d.website) return { ok: true, refNo: 'CS-OK' }; // honeypot hit — pretend success

  // validate files BEFORE any write
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) {
    return { ok: false, errors: { files: `Maximum ${MAX_FILES} files allowed` } };
  }
  for (const f of files) {
    const ext = path.extname(f.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(f.type)) {
      return { ok: false, errors: { files: `"${f.name}" is not an allowed file type (PDF, DOC, DOCX, JPG, PNG)` } };
    }
    if (f.size > MAX_FILE_BYTES) {
      return { ok: false, errors: { files: `"${f.name}" exceeds the 10 MB limit` } };
    }
  }

  const mobile = d.mobile.replace(/[^\d]/g, '').slice(-10);

  // Duplicate-submit guard: identical description from same mobile within 3 minutes
  const dup = await prisma.enquiry.findFirst({
    where: {
      customer: { mobile },
      description: d.description,
      createdAt: { gte: new Date(Date.now() - 3 * 60 * 1000) },
    },
    select: { refNo: true },
  });
  if (dup) return { ok: true, refNo: dup.refNo };

  const year = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findUnique({ where: { mobile } });
    if (!customer) {
      const n = await nextRef(tx, 'customer');
      customer = await tx.customer.create({
        data: {
          publicId: customerRef(n),
          fullName: d.fullName,
          mobile,
          college: d.college,
          department: d.course || null,
        },
      });
    } else {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          lastActivity: new Date(),
          college: customer.college || d.college,
          department: customer.department || d.course || null,
        },
      });
    }

    const n = await nextRef(tx, `enquiry-${year}`);
    const refNo = enquiryRef(year, n);

    const service = d.serviceCategory
      ? await tx.service.findFirst({ where: { name: d.serviceCategory } })
      : null;

    const enquiry = await tx.enquiry.create({
      data: {
        refNo,
        customerId: customer.id,
        serviceId: service?.id ?? null,
        serviceCategory: d.serviceCategory || null,
        description: d.description,
        course: d.course || null,
        semester: d.semester || null,
        quantity: d.quantity || null,
        deadline: d.deadline ? new Date(d.deadline) : null,
        needsDelivery: d.needsDelivery === 'yes',
        deliveryAddress: d.deliveryAddress || null,
        consentGiven: true,
        statusHistory: { create: { toStatus: 'NEW', note: 'Enquiry submitted from website' } },
      },
    });

    await tx.notification.create({
      data: {
        type: 'new_enquiry',
        title: `New enquiry ${refNo}`,
        body: `${d.fullName} (${d.college}) — ${d.description.slice(0, 120)}`,
        link: `/admin/enquiries/${enquiry.id}`,
      },
    });

    return { enquiry, refNo };
  });

  // store attachments outside the transaction (IO can be slow)
  for (const f of files) {
    try {
      const key = makeStorageKey('enquiries', f.name);
      const buf = Buffer.from(await f.arrayBuffer());
      await saveFile(key, buf, f.type);
      await prisma.enquiryAttachment.create({
        data: {
          enquiryId: result.enquiry.id,
          fileName: f.name,
          storedKey: key,
          mimeType: f.type,
          sizeBytes: f.size,
          storage: STORAGE_MODE,
        },
      });
    } catch (e) {
      console.error('attachment store failed', e);
    }
  }

  return { ok: true, refNo: result.refNo };
}

export async function submitContactMessage(formData: FormData) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`contact:${ip}`, 6, 10 * 60 * 1000)) {
    return { ok: false, message: 'Too many messages. Please try again later.' };
  }
  const { contactSchema } = await import('@/lib/validation/enquiry');
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  if (parsed.data.website) return { ok: true };
  await prisma.notification.create({
    data: {
      type: 'contact_message',
      title: `Contact message from ${parsed.data.name}`,
      body: `${parsed.data.mobile} — ${parsed.data.message.slice(0, 300)}`,
    },
  });
  return { ok: true };
}
