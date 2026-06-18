import { describe, expect, it } from "vitest";
import { evaluatePasswordRules, passwordPolicyMessage, passwordRulesPass } from "@/lib/password-policy";

describe("password policy", () => {
  it("accepts a strong password", () => {
    const rules = evaluatePasswordRules("PrimeStay#2026");

    expect(passwordRulesPass(rules)).toBe(true);
    expect(passwordPolicyMessage("PrimeStay#2026")).toBeNull();
  });

  it("rejects common weak passwords even with symbols", () => {
    const rules = evaluatePasswordRules("Password123!");

    expect(rules.notCommon).toBe(false);
    expect(passwordRulesPass(rules)).toBe(false);
  });

  it("rejects passwords that contain account identifiers", () => {
    const rules = evaluatePasswordRules("MariaStay#2026", {
      email: "maria@example.com",
      name: "Maria Santos",
    });

    expect(rules.noPersonalInfo).toBe(false);
    expect(passwordRulesPass(rules)).toBe(false);
  });
});
