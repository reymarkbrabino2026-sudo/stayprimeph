import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDistributedRateLimit, checkLoginLockout, clearFailedLoginAttempts, checkRateLimit, rateLimitKey, recordFailedLoginAttempt, resetRateLimits } from "@/lib/rate-limit";

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

  it("normalizes rate limit keys before using request-controlled values", () => {
    expect(rateLimitKey("Checkout Flow", "USER-1", " 203.0.113.10, 10.0.0.1 ")).toBe("checkout-flow:user-1:203.0.113.10");
    expect(rateLimitKey("Upload", undefined)).toBe("upload:anonymous");
    expect(rateLimitKey("../weird scope", "email@example.com")).toBe("..-weird-scope:email-example.com");
  });

  it("progressively locks login attempts after repeated failures", async () => {
    const keys = ["signin:email:user@example.com", "signin:ip:127.0.0.1"];

    await recordFailedLoginAttempt(keys);
    await recordFailedLoginAttempt(keys);
    await recordFailedLoginAttempt(keys);
    await recordFailedLoginAttempt(keys);
    const fifth = await recordFailedLoginAttempt(keys);

    expect(fifth).toMatchObject({
      limited: true,
      remaining: 0,
    });
    expect(fifth.retryAfterSeconds).toBe(300);

    const locked = await checkLoginLockout(keys);
    expect(locked).toMatchObject({
      limited: true,
      retryAfterSeconds: 300,
    });
  });

  it("escalates lockout duration at higher failure counts", async () => {
    const keys = ["signin:email:high-risk@example.com"];

    for (let index = 0; index < 7; index += 1) {
      await recordFailedLoginAttempt(keys);
    }
    const eighth = await recordFailedLoginAttempt(keys);

    expect(eighth.limited).toBe(true);
    expect(eighth.retryAfterSeconds).toBe(900);
  });

  it("clears login lockout state after successful authentication", async () => {
    const keys = ["signin:email:clear@example.com"];
    await recordFailedLoginAttempt(keys);
    await clearFailedLoginAttempts(keys);

    await expect(checkLoginLockout(keys)).resolves.toMatchObject({
      limited: false,
      remaining: 5,
    });
  });
});
