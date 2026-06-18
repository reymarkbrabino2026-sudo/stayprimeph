import { afterEach, describe, expect, test, vi } from "vitest";
import { logger, logSanitizer } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger sanitization", () => {
  test("masks raw emails and redacts sensitive metadata before writing logs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("signin_failed", {
      email: "alice.operator@example.com",
      message: "Password reset requested by bob.customer@example.com",
      nested: {
        token: "raw-reset-token",
        payoutIdentifier: "bank-account-123456789",
      },
      recipients: ["carol.host@example.com"],
    });

    const payload = String(warn.mock.calls[0][0]);
    expect(payload).not.toContain("alice.operator@example.com");
    expect(payload).not.toContain("bob.customer@example.com");
    expect(payload).not.toContain("carol.host@example.com");
    expect(payload).not.toContain("raw-reset-token");
    expect(payload).not.toContain("bank-account-123456789");
    expect(payload).toContain("a***r@example.com");
    expect(payload).toContain("b***r@example.com");
    expect(payload).toContain("[redacted]");
  });

  test("sanitizes Error objects without logging stack traces", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Provider failed for jane.guest@example.com");
    error.stack = "stack with jane.guest@example.com and raw internals";

    logger.error("email_send_failed", { error, phone: "+639171234567" });

    const payload = String(errorLog.mock.calls[0][0]);
    expect(payload).not.toContain("jane.guest@example.com");
    expect(payload).not.toContain("+639171234567");
    expect(payload).not.toContain("raw internals");
    expect(payload).toContain("j***t@example.com");
    expect(JSON.parse(payload).error).toEqual({
      name: "Error",
      message: "Provider failed for j***t@example.com",
    });
  });

  test("exposes sanitizer helpers for non-logger script and adapter boundaries", () => {
    expect(logSanitizer.maskEmail("ops@stayprimeph.com")).toBe("o***s@stayprimeph.com");
    expect(logSanitizer.sanitizeString("Contact finance@example.com")).toBe("Contact f***e@example.com");
  });
});
