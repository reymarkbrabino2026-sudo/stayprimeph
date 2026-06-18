import type { Duration } from "@upstash/ratelimit";

type Entry = { count: number; resetAt: number };
type LoginAttemptEntry = { count: number; firstFailedAt: number; lockedUntil: number };
const buckets = new Map<string, Entry>();
const loginAttempts = new Map<string, LoginAttemptEntry>();
const distributedLimiterPromises = new Map<string, Promise<import("@upstash/ratelimit").Ratelimit | null>>();
let redisPromise: Promise<import("@upstash/redis").Redis | null> | null = null;

const loginFailureWindowMs = 15 * 60_000;
const loginLockoutSteps = [
  { failures: 5, lockMs: 5 * 60_000 },
  { failures: 8, lockMs: 15 * 60_000 },
  { failures: 10, lockMs: 60 * 60_000 },
  { failures: 12, lockMs: 24 * 60 * 60_000 },
];

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
  loginAttempts.clear();
  distributedLimiterPromises.clear();
  redisPromise = null;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" && process.env.STAYPRIMEPH_BUILD_PHASE !== "1" && process.env.STAYPRIMEPH_E2E !== "1";
}

function hasUpstashRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function requireUpstashRedisConfig() {
  if (hasUpstashRedisConfig()) return;
  if (isProductionRuntime()) {
    throw new Error("Upstash Redis must be configured for production rate limiting.");
  }
}

async function getRedis() {
  if (!redisPromise) {
    redisPromise = (async () => {
      requireUpstashRedisConfig();
      if (!hasUpstashRedisConfig()) return null;
      const { Redis } = await import("@upstash/redis");
      return Redis.fromEnv();
    })();
  }
  return redisPromise;
}

function upstashWindow(windowMs: number): Duration {
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s` as Duration;
}

async function getDistributedLimiter(limit: number, windowMs: number) {
  const limiterKey = `${limit}:${windowMs}`;
  if (!distributedLimiterPromises.has(limiterKey)) {
    distributedLimiterPromises.set(limiterKey, (async () => {
      requireUpstashRedisConfig();
      if (!hasUpstashRedisConfig()) return null;
      const [{ Redis }, { Ratelimit }] = await Promise.all([
        import("@upstash/redis"),
        import("@upstash/ratelimit"),
      ]);
      return new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, upstashWindow(windowMs)),
        analytics: true,
        prefix: `stayprimeph:${limit}:${windowMs}`,
      });
    })());
  }
  return distributedLimiterPromises.get(limiterKey)!;
}

function loginAttemptKey(key: string) {
  return `login-attempt:${key}`;
}

function activeLoginEntry(entry: LoginAttemptEntry | null | undefined, now = Date.now()) {
  if (!entry) return null;
  if (entry.lockedUntil > now) return entry;
  if (entry.firstFailedAt + loginFailureWindowMs > now) return entry;
  return null;
}

function lockoutForFailureCount(count: number) {
  let lockMs = 0;
  for (const step of loginLockoutSteps) {
    if (count >= step.failures) lockMs = step.lockMs;
  }
  return lockMs;
}

async function readLoginAttempt(key: string) {
  const redis = await getRedis();
  if (!redis) return activeLoginEntry(loginAttempts.get(key));

  const stored = await redis.get<LoginAttemptEntry>(loginAttemptKey(key));
  const active = activeLoginEntry(stored);
  if (!active && stored) await redis.del(loginAttemptKey(key));
  return active;
}

async function writeLoginAttempt(key: string, entry: LoginAttemptEntry) {
  const redis = await getRedis();
  if (!redis) {
    loginAttempts.set(key, entry);
    return;
  }

  const ttlSeconds = Math.max(
    60,
    Math.ceil((Math.max(entry.firstFailedAt + loginFailureWindowMs, entry.lockedUntil) - Date.now()) / 1000),
  );
  await redis.set(loginAttemptKey(key), entry, { ex: ttlSeconds });
}

async function deleteLoginAttempt(key: string) {
  const redis = await getRedis();
  if (!redis) {
    loginAttempts.delete(key);
    return;
  }
  await redis.del(loginAttemptKey(key));
}

export async function checkLoginLockout(keys: string[]) {
  if (process.env.STAYPRIMEPH_E2E === "1") {
    return { limited: false, remaining: loginLockoutSteps[0].failures, resetAt: Date.now() + loginFailureWindowMs };
  }

  const entries = (await Promise.all(keys.map((key) => readLoginAttempt(key)))).filter((entry): entry is LoginAttemptEntry => Boolean(entry));
  const locked = entries.filter((entry) => entry.lockedUntil > Date.now()).sort((a, b) => b.lockedUntil - a.lockedUntil)[0];
  if (locked) {
    return {
      limited: true,
      remaining: 0,
      resetAt: locked.lockedUntil,
      retryAfterSeconds: Math.max(1, Math.ceil((locked.lockedUntil - Date.now()) / 1000)),
    };
  }

  const highestCount = entries.reduce((max, entry) => Math.max(max, entry.count), 0);
  return {
    limited: false,
    remaining: Math.max(0, loginLockoutSteps[0].failures - highestCount),
    resetAt: entries[0]?.firstFailedAt ? entries[0].firstFailedAt + loginFailureWindowMs : Date.now() + loginFailureWindowMs,
  };
}

export async function recordFailedLoginAttempt(keys: string[]) {
  if (process.env.STAYPRIMEPH_E2E === "1") {
    return { limited: false, remaining: loginLockoutSteps[0].failures, resetAt: Date.now() + loginFailureWindowMs };
  }

  const now = Date.now();
  const updatedEntries = await Promise.all(keys.map(async (key) => {
    const existing = await readLoginAttempt(key);
    const count = existing ? existing.count + 1 : 1;
    const firstFailedAt = existing ? existing.firstFailedAt : now;
    const lockMs = lockoutForFailureCount(count);
    const entry = {
      count,
      firstFailedAt,
      lockedUntil: lockMs ? now + lockMs : 0,
    };
    await writeLoginAttempt(key, entry);
    return entry;
  }));

  const locked = updatedEntries.filter((entry) => entry.lockedUntil > now).sort((a, b) => b.lockedUntil - a.lockedUntil)[0];
  if (locked) {
    return {
      limited: true,
      remaining: 0,
      resetAt: locked.lockedUntil,
      retryAfterSeconds: Math.max(1, Math.ceil((locked.lockedUntil - now) / 1000)),
    };
  }

  const highestCount = updatedEntries.reduce((max, entry) => Math.max(max, entry.count), 0);
  return {
    limited: false,
    remaining: Math.max(0, loginLockoutSteps[0].failures - highestCount),
    resetAt: updatedEntries[0]?.firstFailedAt ? updatedEntries[0].firstFailedAt + loginFailureWindowMs : now + loginFailureWindowMs,
  };
}

export async function clearFailedLoginAttempts(keys: string[]) {
  await Promise.all(keys.map((key) => deleteLoginAttempt(key)));
}

export async function checkDistributedRateLimit(key: string, fallbackLimit = 20, fallbackWindowMs = 60_000) {
  if (process.env.STAYPRIMEPH_E2E === "1") {
    return { limited: false, remaining: fallbackLimit, resetAt: Date.now() + fallbackWindowMs };
  }

  let limiter: import("@upstash/ratelimit").Ratelimit | null;
  try {
    limiter = await getDistributedLimiter(fallbackLimit, fallbackWindowMs);
  } catch (error) {
    if (isProductionRuntime()) {
      return { limited: true, remaining: 0, resetAt: Date.now() + fallbackWindowMs };
    }
    throw error;
  }
  if (!limiter) return checkRateLimit(key, fallbackLimit, fallbackWindowMs);
  const result = await limiter.limit(key);
  return {
    limited: !result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}
