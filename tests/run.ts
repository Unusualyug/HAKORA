/**
 * Basic automated tests for CampusSaathi core logic.
 * Run with: npm test  (requires DATABASE_URL pointing at a running database)
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

// Outside Next.js, stub the 'server-only' guard so server modules can be unit-tested.
{
  const req = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Module = req('node:module') as any;
  const origLoad = Module._load;
  Module._load = function (request: string, ...rest: unknown[]) {
    if (request === 'server-only') return {};
    return origLoad.call(this, request, ...rest);
  };
}

const prisma = new PrismaClient();
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✘ ${name}\n    ${(e as Error).message}`);
  }
}

async function main() {
  console.log('CampusSaathi test suite\n');

  // ── validation ──
  const { enquirySchema } = await import('../src/lib/validation/enquiry');
  await test('enquiry validation accepts a valid submission', () => {
    const r = enquirySchema.safeParse({
      fullName: 'Test Student', mobile: '9876543210', college: 'Test College',
      description: 'I need a 60 page lab manual printed and spiral bound.',
      needsDelivery: 'no', consent: 'on',
    });
    assert.ok(r.success, JSON.stringify(!r.success ? r.error.issues : ''));
  });
  await test('enquiry validation rejects an invalid mobile', () => {
    const r = enquirySchema.safeParse({
      fullName: 'Test', mobile: '12345', college: 'College',
      description: 'A valid description here.', needsDelivery: 'no', consent: 'on',
    });
    assert.ok(!r.success);
  });
  await test('enquiry validation requires consent', () => {
    const r = enquirySchema.safeParse({
      fullName: 'Test Student', mobile: '9876543210', college: 'College',
      description: 'A valid description here.', needsDelivery: 'no',
    });
    assert.ok(!r.success);
  });

  // ── reference numbers ──
  const { enquiryRef, orderRef, customerRef } = await import('../src/lib/refs');
  await test('reference formats are correct', () => {
    assert.equal(enquiryRef(2026, 1), 'CS-2026-0001');
    assert.equal(orderRef(2026, 42), 'CSO-2026-0042');
    assert.equal(customerRef(7), 'CU-0007');
  });

  // ── session signing ──
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-0123456789abcdef';
  const { encodeSession, decodeSession } = await import('../src/lib/auth/session');
  await test('session round-trips and verifies', () => {
    const token = encodeSession({ uid: 'u1', role: 'ADMIN', exp: Date.now() + 10000 });
    const data = decodeSession(token);
    assert.equal(data?.uid, 'u1');
  });
  await test('tampered session is rejected', () => {
    const token = encodeSession({ uid: 'u1', role: 'ADMIN', exp: Date.now() + 10000 });
    assert.equal(decodeSession(token.slice(0, -2) + 'xx'), null);
  });
  await test('expired session is rejected', () => {
    const token = encodeSession({ uid: 'u1', role: 'ADMIN', exp: Date.now() - 1000 });
    assert.equal(decodeSession(token), null);
  });

  // ── password hashing ──
  const { hashPassword, verifyPassword } = await import('../src/lib/auth/password');
  await test('password hash verifies and rejects wrong password', async () => {
    const hash = await hashPassword('CorrectHorse1!');
    assert.ok(await verifyPassword('CorrectHorse1!', hash));
    assert.ok(!(await verifyPassword('wrong', hash)));
  });

  // ── whatsapp links ──
  const { waLink } = await import('../src/lib/whatsapp');
  await test('wa.me links are formatted with encoded message', () => {
    const link = waLink('919825751614', 'Hello CampusSaathi');
    assert.ok(link.startsWith('https://wa.me/919825751614?text=Hello%20CampusSaathi'));
  });

  // ── quotation totals ──
  const { computeTotals } = await import('../src/server/services/quotation');
  await test('quotation totals: subtotal, discount, tax, advance %', () => {
    const t = computeTotals(
      [
        { kind: 'PRINTING', description: 'B/W printing', quantity: 120, unitPrice: 2 },
        { kind: 'BINDING', description: 'Spiral binding', quantity: 2, unitPrice: 40 },
      ],
      20, 18, 'PERCENT', 50,
    );
    assert.equal(t.subtotal, 320);
    assert.equal(t.taxAmount, 54);     // (320-20) * 18%
    assert.equal(t.total, 354);
    assert.equal(t.advanceAmount, 177); // 50%
  });
  await test('quotation totals: FIXED advance is capped at total', () => {
    const t = computeTotals([{ kind: 'OTHER', description: 'x', quantity: 1, unitPrice: 100 }], 0, 0, 'FIXED', 5000);
    assert.equal(t.advanceAmount, 100);
  });

  // ── access tokens ──
  const { generateAccessToken, hashAccessToken, isValidTokenFormat } = await import('../src/lib/tokens');
  await test('portal tokens are unguessable, hashed and validated', () => {
    const { token, hash } = generateAccessToken();
    assert.ok(token.length >= 40, 'token entropy');
    assert.equal(hash, hashAccessToken(token));
    assert.notEqual(token, hash);
    assert.ok(isValidTokenFormat(token));
    assert.ok(!isValidTokenFormat('../etc/passwd'));
    assert.notEqual(generateAccessToken().token, generateAccessToken().token);
  });

  // ── razorpay signatures ──
  process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  const { verifyPaymentSignature, verifyWebhookSignature } = await import('../src/lib/razorpay');
  const { createHmac } = await import('node:crypto');
  await test('checkout signature verification accepts valid, rejects forged', () => {
    const sig = createHmac('sha256', 'test_key_secret').update('order_1|pay_1').digest('hex');
    assert.ok(verifyPaymentSignature('order_1', 'pay_1', sig));
    assert.ok(!verifyPaymentSignature('order_1', 'pay_1', sig.replace(/.$/, '0')));
    assert.ok(!verifyPaymentSignature('order_2', 'pay_1', sig));
  });
  await test('webhook signature verification accepts valid, rejects forged', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const sig = createHmac('sha256', 'test_webhook_secret').update(body).digest('hex');
    assert.ok(verifyWebhookSignature(body, sig));
    assert.ok(!verifyWebhookSignature(body + ' ', sig));
  });

  // ── database ──
  await test('database connects and schema exists', async () => {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.service.count();
  });
  await test('counter generates sequential refs atomically', async () => {
    const key = `test-${Date.now()}`;
    const vals = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        prisma.counter.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } }),
      ),
    );
    const set = new Set(vals.map((v) => v.value));
    assert.equal(set.size, 5, 'values must be unique');
    await prisma.counter.delete({ where: { key } });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main();
