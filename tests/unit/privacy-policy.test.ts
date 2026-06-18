import { describe, expect, it } from "vitest";
import { legalPageMap } from "@/lib/legal-data";

describe("privacy policy", () => {
  it("matches implemented account, payment, audit, retention, and privacy-rights flows", () => {
    const privacy = legalPageMap.privacy;
    const text = [
      privacy.description,
      privacy.updatedAt,
      ...privacy.sections.flatMap((section) => [section.title, ...section.body]),
    ].join("\n");

    expect(privacy.updatedAt).toBe("June 18, 2026");
    expect(text).toContain("password hash");
    expect(text).toContain("session records");
    expect(text).toContain("admin MFA");
    expect(text).toContain("hashed email and IP values");
    expect(text).toContain("protected payout or tax identifiers");
    expect(text).toContain("Immutable audit logs");
    expect(text).toContain("ordinary messages may be retained for up to 730 days");
    expect(text).toContain("ordinary audit logs for up to 2,555 days");
    expect(text).toContain("preserved as compliance evidence");
    expect(text).toContain("machine-readable export");
    expect(text).toContain("one-time email verification");
    expect(text).toContain("HttpOnly, Secure in production, and SameSite=Lax");
    expect(text).toContain("avoids storing auth or session tokens in localStorage");
  });
});
