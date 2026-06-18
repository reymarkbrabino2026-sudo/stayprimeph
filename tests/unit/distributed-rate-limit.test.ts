import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDistributedRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkDistributedRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimits();
  });

  it("falls back to the local limiter when Redis is not configured", async () => {
    resetRateLimits();
    const first = await checkDistributedRateLimit("fallback", 1);
    const second = await checkDistributedRateLimit("fallback", 1);
    expect(first.limited).toBe(false);
    expect(second.limited).toBe(true);
  });

  it("fails closed in production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetRateLimits();

    await expect(checkDistributedRateLimit("production-missing-redis", 10, 60_000)).resolves.toMatchObject({
      limited: true,
      remaining: 0,
    });
  });

  it("builds route-specific Upstash sliding windows", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/rate-limit.ts", "utf8"));

    expect(source).toContain("Ratelimit.slidingWindow(limit, upstashWindow(windowMs))");
    expect(source).toContain("const limiterKey = `${limit}:${windowMs}`");
    expect(source).toContain("prefix: `stayprimeph:${limit}:${windowMs}`");
  });
});
