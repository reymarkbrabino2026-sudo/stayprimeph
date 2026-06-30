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

vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  clearAllSessionsForUser: vi.fn(),
  clearSession: vi.fn(),
  createSession: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
  requireUser: vi.fn(),
  roleHome: vi.fn(() => "/admin/dashboard"),
  sessionMetadataFromHeaders: vi.fn((_headers: Headers, overrides?: Record<string, unknown>) => ({ userAgent: "Test Browser", ipAddress: "127.0.x.x", ...overrides })),
  verifyPassword: vi.fn(() => true),
}));

vi.mock("@/lib/auth-tokens", () => ({
  completeEmailChange: vi.fn(),
  consumeAuthToken: vi.fn(),
  consumeEmailVerificationCode: vi.fn(),
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
  sendPasswordChangedEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPrivilegedMfaEmail: vi.fn(),
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

import { requestPasswordReset, resendAdminMfa, resetPassword, signIn, signOutAllDevices, verifyAdminMfa } from "@/app/auth/actions";
import { clearPendingAdminMfaChallenge, createPendingAdminMfaChallenge, readPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { appendAuditLog } from "@/lib/audit-logs";
import { clearAllSessionsForUser, clearSession, createSession, requireUser, verifyPassword } from "@/lib/auth";
import { consumeAuthToken, getAuthToken, issueAuthToken, updateUserPassword } from "@/lib/auth-tokens";
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendPrivilegedMfaEmail, sendVerificationEmail } from "@/lib/email";
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
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
};

const hostUser: User = {
  ...adminUser,
  id: "host-1",
  name: "StayPrime Host",
  email: "host@example.com",
  role: "host",
  avatar: "SH",
};

const adminMfaToken: AuthToken = {
  id: "token-1",
  userId: adminUser.id,
  tokenHash: "hashed-token-value",
  type: "admin_mfa",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: new Date().toISOString(),
};

const passwordResetToken: AuthToken = {
  ...adminMfaToken,
  id: "reset-token-1",
  type: "password_reset",
};

function signinForm() {
  const formData = new FormData();
  formData.set("email", adminUser.email);
  formData.set("password", "CorrectHorseBatteryStaple#2026");
  formData.set("requestedRole", "admin");
  formData.set("next", "/admin/payments");
  return formData;
}

function hostSigninForm() {
  const formData = new FormData();
  formData.set("email", hostUser.email);
  formData.set("password", "CorrectHorseBatteryStaple#2026");
  formData.set("requestedRole", "host");
  formData.set("next", "/host/bookings");
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
    expect(sendPrivilegedMfaEmail).toHaveBeenCalledWith({
      to: adminUser.email,
      name: adminUser.name,
      code: "123456",
      role: "admin",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("next=%2Fadmin%2Fpayments"));
  });

  it("requires email verification before MFA or session creation", async () => {
    const unverifiedAdmin = { ...adminUser, emailVerifiedAt: undefined };
    vi.mocked(getUsers).mockResolvedValueOnce([unverifiedAdmin]);

    await expect(signIn(signinForm())).rejects.toThrow("NEXT_REDIRECT:/verify-email?");

    expect(issueAuthToken).toHaveBeenCalledWith(unverifiedAdmin.id, "email_verification", { codeHash: expect.any(String) });
    expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: unverifiedAdmin.email,
      name: unverifiedAdmin.name,
      code: expect.stringMatching(/^\d{6}$/),
    }));
    expect(createPendingAdminMfaChallenge).not.toHaveBeenCalled();
    expect(sendPrivilegedMfaEmail).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("role=admin"));
  });

  it("persists an audit log for failed login attempts", async () => {
    vi.mocked(getUsers).mockResolvedValueOnce([adminUser]);
    vi.mocked(verifyPassword).mockReturnValueOnce(false);

    await expect(signIn(signinForm())).rejects.toThrow("NEXT_REDIRECT:/admin/login?");

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: adminUser.id,
      actorRole: "admin",
      action: "auth.login_failed",
      entityType: "user",
      entityId: adminUser.id,
      metadata: expect.objectContaining({
        reason: "invalid_credentials",
        requestedRole: "admin",
        emailHash: expect.any(String),
        ipHash: expect.any(String),
      }),
    }));
    expect(vi.mocked(appendAuditLog).mock.calls[0][0].metadata).not.toHaveProperty("email");
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
    expect(createSession).toHaveBeenCalledWith(adminUser.id, expect.objectContaining({ mfaRole: "admin" }));
  });

  it("requires MFA after a valid host password before creating a session", async () => {
    vi.mocked(getUsers).mockResolvedValueOnce([hostUser]);

    await expect(signIn(hostSigninForm())).rejects.toThrow("NEXT_REDIRECT:/login?mfa=1&role=host");

    expect(issueAuthToken).toHaveBeenCalledWith(hostUser.id, "admin_mfa");
    expect(createPendingAdminMfaChallenge).toHaveBeenCalledWith("mfa-token");
    expect(sendPrivilegedMfaEmail).toHaveBeenCalledWith({
      to: hostUser.email,
      name: hostUser.name,
      code: "123456",
      role: "host",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("next=%2Fhost%2Fbookings"));
  });

  it("resends a fresh admin MFA code without creating a session", async () => {
    vi.mocked(readPendingAdminMfaChallenge).mockResolvedValueOnce("mfa-token");
    vi.mocked(getAuthToken).mockResolvedValueOnce(adminMfaToken);
    vi.mocked(getUserById).mockResolvedValueOnce(adminUser);
    vi.mocked(issueAuthToken).mockResolvedValueOnce("fresh-mfa-token");

    const formData = new FormData();
    formData.set("next", "/admin/payments");

    await expect(resendAdminMfa(formData)).rejects.toThrow("NEXT_REDIRECT:/admin/login?mfa=1");

    expect(getAuthToken).toHaveBeenCalledWith("mfa-token", "admin_mfa");
    expect(issueAuthToken).toHaveBeenCalledWith(adminUser.id, "admin_mfa");
    expect(createPendingAdminMfaChallenge).toHaveBeenCalledWith("fresh-mfa-token");
    expect(sendPrivilegedMfaEmail).toHaveBeenCalledWith({
      to: adminUser.email,
      name: adminUser.name,
      code: "123456",
      role: "admin",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("message=We+sent+a+new+admin+code."));
    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("next=%2Fadmin%2Fpayments"));
  });

  it("does not resend an expired admin MFA challenge", async () => {
    vi.mocked(readPendingAdminMfaChallenge).mockResolvedValueOnce("mfa-token");
    vi.mocked(getAuthToken).mockResolvedValueOnce(null);

    await expect(resendAdminMfa(new FormData())).rejects.toThrow("NEXT_REDIRECT:/admin/login?mfa=1&error=Sign-in+challenge+expired.+Log+in+again.");

    expect(sendPrivilegedMfaEmail).not.toHaveBeenCalled();
    expect(clearPendingAdminMfaChallenge).toHaveBeenCalled();
  });

  it("revokes every session for the current user when logging out all devices", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(adminUser);

    await expect(signOutAllDevices()).rejects.toThrow("NEXT_REDIRECT:/login?message=You%20have%20been%20logged%20out%20from%20all%20devices.");

    expect(clearAllSessionsForUser).toHaveBeenCalledWith(adminUser.id);
    expect(clearSession).toHaveBeenCalled();
  });
});

describe("password reset audit logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists an audit log when a password reset is requested for an existing account", async () => {
    vi.mocked(getUsers).mockResolvedValueOnce([adminUser]);
    const formData = new FormData();
    formData.set("email", adminUser.email);

    await expect(requestPasswordReset(formData)).rejects.toThrow("NEXT_REDIRECT:/forgot-password?sent=1");

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: adminUser.email,
      name: adminUser.name,
      token: "mfa-token",
    });
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "anonymous",
      actorRole: "system",
      action: "account.password_reset_requested",
      entityType: "user",
      entityId: adminUser.id,
      metadata: expect.objectContaining({
        emailHash: expect.any(String),
        ipHash: expect.any(String),
      }),
    }));
  });

  it("persists an audit log when a password reset is completed", async () => {
    vi.mocked(getAuthToken).mockResolvedValueOnce(passwordResetToken);
    vi.mocked(getUserById).mockResolvedValueOnce(adminUser);
    vi.mocked(consumeAuthToken).mockResolvedValueOnce(passwordResetToken);
    const formData = new FormData();
    formData.set("email", adminUser.email);
    formData.set("password", "ChangedPassword#2026");
    formData.set("confirmPassword", "ChangedPassword#2026");

    await expect(resetPassword("raw-reset-token", formData)).rejects.toThrow("NEXT_REDIRECT:/login?message=");

    expect(updateUserPassword).toHaveBeenCalledWith(adminUser.id, "hashed:ChangedPassword#2026");
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith({ to: adminUser.email, name: adminUser.name });
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: adminUser.id,
      actorRole: "admin",
      action: "account.password_reset_completed",
      entityType: "user",
      entityId: adminUser.id,
      metadata: { sessionsRevoked: true },
    }));
  });
});
