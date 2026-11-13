/**
 * Tiny in-memory sliding-window rate limiter (per warm server instance - free, no database calls).
 * It stops one account from hammering the expensive AI endpoints. It isn't a global guarantee across
 * instances; for that, use Upstash/Vercel KV later.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

export const TOO_MANY = { error: "Too many requests. Please wait a few minutes and try again." };
