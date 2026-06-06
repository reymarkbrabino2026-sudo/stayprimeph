import { describe, expect, it } from "vitest";
import { checkDistributedRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkDistributedRateLimit", () => {
  it("falls back to the local limiter when Redis is not configured", async () => {
    resetRateLimits();
    const first = await checkDistributedRateLimit("fallback", 1);
    const second = await checkDistributedRateLimit("fallback", 1);
    expect(first.limited).toBe(false);
    expect(second.limited).toBe(true);
  });
});
