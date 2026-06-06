import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDistributedRateLimit, checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.setSystemTime(new Date("2026-05-17T00:00:00Z"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("limits requests after the configured threshold", () => {
    expect(checkRateLimit("ip", 2).limited).toBe(false);
    expect(checkRateLimit("ip", 2).limited).toBe(false);
    expect(checkRateLimit("ip", 2).limited).toBe(true);
  });

  it("resets after the window expires", () => {
    checkRateLimit("ip", 1, 1000);
    vi.setSystemTime(new Date("2026-05-17T00:00:02Z"));
    expect(checkRateLimit("ip", 1, 1000).limited).toBe(false);
  });

  it("bypasses distributed limits during e2e runs", async () => {
    vi.stubEnv("STAYPRIMEPH_E2E", "1");
    await expect(checkDistributedRateLimit("signin:local", 0)).resolves.toMatchObject({
      limited: false,
      remaining: 0,
    });
  });
});
