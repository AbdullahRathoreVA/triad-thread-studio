/**
 * Fixed-window rate limiter, in memory.
 *
 * Honest about its limits: this is per-instance. On Vercel's free tier a route
 * may run in several isolates, so the effective ceiling is `limit × instances`.
 * That is fine for its actual job — stopping a single script hammering the
 * order endpoint — and it costs nothing.
 *
 * If abuse becomes real, swap the `hit()` body for Upstash Redis; the call
 * sites do not change. See docs/SECURITY.md.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function hit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return {
      ok: true,
      remaining: limit - 1,
      resetAt: bucket.resetAt,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  const ok = existing.count <= limit;

  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Client IP from proxy headers.
 *
 * Takes the FIRST entry of x-forwarded-for: downstream proxies append, so the
 * leftmost value is the original client. A caller can spoof it, which is why
 * this is only ever used for rate limiting and never for authorisation.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
