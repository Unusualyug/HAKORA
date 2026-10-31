// Simple in-memory fixed-window rate limiter.
// For multi-instance deployments swap with a Redis/DB-backed implementation.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

// prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, k) => { if (b.resetAt < now) buckets.delete(k); });
}, 60_000).unref?.();
