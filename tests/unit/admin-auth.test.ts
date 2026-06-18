import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/admin-mfa", () => ({
  clearPendingAdminMfaChallenge: vi.fn(),
  createAdminMfaCode: vi.fn(() => "123456"),
  createPendingAdminMfaChallenge: vi.fn(),
  isAdminMfaCodeValid: vi.fn(() => true),
  readPendingAdminMfaChallenge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  clearAllSessionsForUser: vi.fn(),
  clearSession: vi.fn(),
  createSession: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
  requireUser: vi.fn(),
  roleHome: vi.fn(() => "/admin/dashboard"),
  verifyPassword: vi.fn(() => true),
}));

vi.mock("@/lib/auth-tokens", () => ({
  completeEmailChange: vi.fn(),
  consumeAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
  hashAuthTokenValue: vi.fn(() => "hashed-token-value"),
  issueAuthToken: vi.fn(async () => "mfa-token"),
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
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
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
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(async () => []),
  writeStoredUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
  getUsers: vi.fn(async () => []),
}));

import { signIn, signOutAllDevices, verifyAdminMfa } from "@/app/auth/actions";
import { createPendingAdminMfaChallenge, readPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { clearAllSessionsForUser, clearSession, createSession, requireUser, verifyPassword } from "@/lib/auth";
import { consumeAuthToken, getAuthToken, issueAuthToken } from "@/lib/auth-tokens";
import { sendAdminMfaEmail } from "@/lib/email";
import { checkLoginLockout } from "@/lib/rate-limit";
import { getUserById, getUsers } from "@/lib/users";
import type { AuthToken, User } from "@/lib/types";

const adminUser: User = {
  id: "admin-1",
  name: "StayPrime Admin",
  email: "admin@example.com",
  role: "admin",
  avatar: "SA",
  phone: "",
  createdAt: "2026-06-18",
  passwordHash: "hashed-password",
};

const adminMfaToken: AuthToken = {
  id: "token-1",
  userId: adminUser.id,
  tokenHash: "hashed-token-value",
  type: "admin_mfa",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: new Date().toISOString(),
};

function signinForm() {
  const formData = new FormData();
  formData.set("email", adminUser.email);
  formData.set("password", "CorrectHorseBatteryStaple#2026");
  formData.set("requestedRole", "admin");
  formData.set("next", "/admin/payments");
  return formData;
}

describe("admin MFA sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires MFA after a valid admin password before creating a session", async () => {
    vi.mocked(getUsers).mockResolvedValueOnce([adminUser]);

    await expect(signIn(signinForm())).rejects.toThrow("NEXT_REDIRECT:/admin/login?mfa=1");

    expect(issueAuthToken).toHaveBeenCalledWith(adminUser.id, "admin_mfa");
    expect(createPendingAdminMfaChallenge).toHaveBeenCalledWith("mfa-token");
    expect(sendAdminMfaEmail).toHaveBeenCalledWith({
      to: adminUser.email,
      name: adminUser.name,
      code: "123456",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("next=%2Fadmin%2Fpayments"));
  });

  it("blocks sign-in during progressive lockout before password verification", async () => {
    vi.mocked(checkLoginLockout).mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 5 * 60_000,
      retryAfterSeconds: 300,
    });

    await expect(signIn(signinForm())).rejects.toThrow("NEXT_REDIRECT:/admin/login?");

    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("Too+many+login+attempts"));
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("5+minutes"));
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("creates the admin session only after a valid MFA code", async () => {
    vi.mocked(readPendingAdminMfaChallenge).mockResolvedValueOnce("mfa-token");
    vi.mocked(getAuthToken).mockResolvedValueOnce(adminMfaToken);
    vi.mocked(getUserById).mockResolvedValueOnce(adminUser);
    vi.mocked(consumeAuthToken).mockResolvedValueOnce(adminMfaToken);

    const formData = new FormData();
    formData.set("code", "123456");
    formData.set("next", "/admin/payments");

    await expect(verifyAdminMfa(formData)).rejects.toThrow("NEXT_REDIRECT:/admin/payments");

    expect(getAuthToken).toHaveBeenCalledWith("mfa-token", "admin_mfa");
    expect(consumeAuthToken).toHaveBeenCalledWith("mfa-token", "admin_mfa");
    expect(createSession).toHaveBeenCalledWith(adminUser.id);
  });

  it("revokes every session for the current user when logging out all devices", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(adminUser);

    await expect(signOutAllDevices()).rejects.toThrow("NEXT_REDIRECT:/login?message=You%20have%20been%20logged%20out%20from%20all%20devices.");

    expect(clearAllSessionsForUser).toHaveBeenCalledWith(adminUser.id);
    expect(clearSession).toHaveBeenCalled();
  });
});
