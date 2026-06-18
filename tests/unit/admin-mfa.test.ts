import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-with-at-least-32-characters",
  },
}));

import { createAdminMfaCode, isAdminMfaCodeValid } from "@/lib/admin-mfa";

describe("admin MFA codes", () => {
  it("creates stable 6-digit codes and rejects incorrect codes", () => {
    const code = createAdminMfaCode("pending-admin-token");

    expect(code).toMatch(/^\d{6}$/);
    expect(createAdminMfaCode("pending-admin-token")).toBe(code);
    expect(isAdminMfaCodeValid("pending-admin-token", code)).toBe(true);
    expect(isAdminMfaCodeValid("pending-admin-token", code === "000000" ? "000001" : "000000")).toBe(false);
    expect(isAdminMfaCodeValid("pending-admin-token", "12345")).toBe(false);
  });
});
