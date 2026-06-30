import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  clearAllSessionsForUser: vi.fn(),
  clearSession: vi.fn(),
  createSession: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
  requireUser: vi.fn(),
  roleHome: vi.fn(() => "/guest/dashboard"),
  sessionMetadataFromHeaders: vi.fn(() => ({})),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/admin-mfa", () => ({
  clearPendingAdminMfaChallenge: vi.fn(),
  createAdminMfaCode: vi.fn(),
  createPendingAdminMfaChallenge: vi.fn(),
  isAdminMfaCodeValid: vi.fn(),
  readPendingAdminMfaChallenge: vi.fn(),
}));

vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth-tokens", () => ({
  completeEmailChange: vi.fn(),
  consumeAuthToken: vi.fn(),
  consumeEmailVerificationCode: vi.fn(),
  getAuthToken: vi.fn(),
  hashAuthTokenValue: vi.fn(),
  issueAuthToken: vi.fn(async () => "token"),
  markUserEmailVerified: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("@/lib/canonical-paths", () => ({
  normalizeKnownAppPath: vi.fn((path: string) => path),
}));

vi.mock("@/lib/email", () => ({
  sendAdminMfaEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPrivilegedMfaEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/email-verification-code", () => ({
  createEmailVerificationCode: vi.fn(() => "123456"),
  hashEmailVerificationCode: vi.fn(() => "code-hash"),
  normalizeEmailVerificationCode: vi.fn((value: string) => value.trim()),
}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-with-at-least-32-characters",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkLoginLockout: vi.fn(async () => ({ limited: false })),
  clearFailedLoginAttempts: vi.fn(),
  checkDistributedRateLimit: vi.fn(async () => ({ limited: false })),
  recordFailedLoginAttempt: vi.fn(async () => ({ limited: false })),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(async () => new Headers({ host: "example.com" })),
  isTrustedRequestOrigin: vi.fn(() => true),
}));

vi.mock("@/lib/repositories", () => ({
  createUserInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  hasSupabaseConfig: vi.fn(() => false),
  isGoogleAuthEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(async () => []),
  writeStoredUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
  getUsers: vi.fn(async () => []),
}));

import { signInWithGoogle, signUp, verifyEmailCode } from "@/app/auth/actions";
import { createSession } from "@/lib/auth";
import { consumeEmailVerificationCode, issueAuthToken, markUserEmailVerified } from "@/lib/auth-tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { createSupabaseServerClient, hasSupabaseConfig, isGoogleAuthEnabled } from "@/lib/supabase/server";
import { writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";

function signupForm(email = "maria@example.com") {
  const formData = new FormData();
  formData.set("name", "Maria Santos");
  formData.set("email", email);
  formData.set("password", "PrimeStay#2026");
  formData.set("confirmPassword", "PrimeStay#2026");
  formData.set("role", "guest");
  return formData;
}

describe("signUp security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects weak signup passwords before creating a user", async () => {
    const formData = new FormData();
    formData.set("name", "Maria Santos");
    formData.set("email", "maria@example.com");
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");
    formData.set("role", "guest");

    await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/register?");

    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("Use+a+stronger+password"));
    expect(writeStoredUsers).not.toHaveBeenCalled();
  });

  it("does not start Google OAuth while the Google provider is disabled", async () => {
    vi.mocked(hasSupabaseConfig).mockReturnValueOnce(true);
    vi.mocked(isGoogleAuthEnabled).mockReturnValueOnce(false);

    const formData = new FormData();
    formData.set("authMode", "login");

    await expect(signInWithGoogle(formData)).rejects.toThrow("NEXT_REDIRECT:/login?");

    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("Google%20login%20is%20temporarily%20unavailable"));
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects mismatched signup passwords before creating a user", async () => {
    const formData = signupForm();
    formData.set("confirmPassword", "DifferentPassword#2026");

    await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/register?");

    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("Passwords+do+not+match"));
    expect(writeStoredUsers).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("rejects duplicate signup emails without sending a reset or verification email", async () => {
    const existingUser = {
      id: "user-1",
      name: "Maria Santos",
      email: "maria@example.com",
      role: "guest",
      avatar: "MS",
      phone: "",
      createdAt: "2026-06-18",
      passwordHash: "hash",
    } as const;

    vi.mocked(getUsers).mockResolvedValueOnce([existingUser]);
    await expect(signUp(signupForm(existingUser.email))).rejects.toThrow("NEXT_REDIRECT:/register?");
    const duplicateRedirect = vi.mocked(redirectMock).mock.calls.at(-1)?.[0] ?? "";

    expect(duplicateRedirect).toContain("This+email+is+already+registered");
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(writeStoredUsers).not.toHaveBeenCalled();
  });

  it("creates a fresh user and redirects to email code verification", async () => {
    vi.mocked(getUsers).mockResolvedValueOnce([]);
    await expect(signUp(signupForm("new-user@example.com"))).rejects.toThrow("NEXT_REDIRECT:/verify-email?");
    const freshRedirect = vi.mocked(redirectMock).mock.calls.at(-1)?.[0] ?? "";

    expect(freshRedirect).toContain("/verify-email?");
    expect(freshRedirect).toContain("We+sent+a+6-digit+verification+code");
    expect(issueAuthToken).toHaveBeenCalledWith(expect.any(String), "email_verification", { codeHash: "code-hash" });
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "new-user@example.com",
      code: "123456",
    }));
    expect(createSession).not.toHaveBeenCalled();
  });

  it("verifies an email when the submitted code matches the pending token", async () => {
    const user = {
      id: "user-1",
      name: "Maria Santos",
      email: "maria@example.com",
      role: "guest",
      avatar: "MS",
      phone: "",
      createdAt: "2026-06-18",
      passwordHash: "hash",
    } as const;
    const formData = new FormData();
    formData.set("email", user.email);
    formData.set("code", "123456");
    formData.set("role", "guest");

    vi.mocked(getUsers).mockResolvedValueOnce([user]);
    vi.mocked(consumeEmailVerificationCode).mockResolvedValueOnce({
      id: "token-1",
      userId: user.id,
      tokenHash: "hash",
      type: "email_verification",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      metadata: { codeHash: "code-hash" },
    });

    await expect(verifyEmailCode(formData)).rejects.toThrow("NEXT_REDIRECT:/login?");

    expect(consumeEmailVerificationCode).toHaveBeenCalledWith(user.id, "code-hash");
    expect(markUserEmailVerified).toHaveBeenCalledWith(user.id);
  });
});
