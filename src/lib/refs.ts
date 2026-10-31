import { Prisma } from '@prisma/client';

/** Atomically generate sequential, human-readable reference numbers. */
export async function nextRef(tx: Prisma.TransactionClient, key: string): Promise<number> {
  const row = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

export function enquiryRef(year: number, n: number) {
  return `CS-${year}-${String(n).padStart(4, '0')}`;
}

export function orderRef(year: number, n: number) {
  return `CSO-${year}-${String(n).padStart(4, '0')}`;
}

export function customerRef(n: number) {
  return `CU-${String(n).padStart(4, '0')}`;
}
