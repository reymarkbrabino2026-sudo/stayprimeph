type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
let distributedLimiterPromise: Promise<import("@upstash/ratelimit").Ratelimit | null> | null = null;

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const existing = buckets.get(key);
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  entry.count += 1;
  buckets.set(key, entry);
  return { limited: entry.count > limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

export function resetRateLimits() {
  buckets.clear();
}

async function getDistributedLimiter() {
  if (!distributedLimiterPromise) {
    distributedLimiterPromise = (async () => {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
      const [{ Redis }, { Ratelimit }] = await Promise.all([
        import("@upstash/redis"),
        import("@upstash/ratelimit"),
      ]);
      return new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "stayprimeph",
      });
    })();
  }
  return distributedLimiterPromise;
}

export async function checkDistributedRateLimit(key: string, fallbackLimit = 20, fallbackWindowMs = 60_000) {
  if (process.env.STAYPRIMEPH_E2E === "1") {
    return { limited: false, remaining: fallbackLimit, resetAt: Date.now() + fallbackWindowMs };
  }

  const limiter = await getDistributedLimiter();
  if (!limiter) return checkRateLimit(key, fallbackLimit, fallbackWindowMs);
  const result = await limiter.limit(key);
  return {
    limited: !result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}
