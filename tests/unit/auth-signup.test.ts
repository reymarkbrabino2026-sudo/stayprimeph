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
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/admin-mfa", () => ({
  clearPendingAdminMfaChallenge: vi.fn(),
  createAdminMfaCode: vi.fn(),
  createPendingAdminMfaChallenge: vi.fn(),
  isAdminMfaCodeValid: vi.fn(),
  readPendingAdminMfaChallenge: vi.fn(),
}));

vi.mock("@/lib/auth-tokens", () => ({
  completeEmailChange: vi.fn(),
  consumeAuthToken: vi.fn(),
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

import { signUp } from "@/app/auth/actions";
import { createSession } from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { writeStoredUsers } from "@/lib/user-store";
import { getUsers } from "@/lib/users";

function signupForm(email = "maria@example.com") {
  const formData = new FormData();
  formData.set("name", "Maria Santos");
  formData.set("email", email);
  formData.set("password", "PrimeStay#2026");
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
    formData.set("role", "guest");

    await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/register?");

    expect(redirectMock).toHaveBeenCalledWith(expect.stringContaining("Use+a+stronger+password"));
    expect(writeStoredUsers).not.toHaveBeenCalled();
  });

  it("uses the same generic response for duplicate and fresh signup attempts", async () => {
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
    const genericNotice = "If+we+can+process+that+signup%2C+we+sent+next+steps+to+the+email+address+provided.";

    vi.mocked(getUsers).mockResolvedValueOnce([existingUser]);
    await expect(signUp(signupForm(existingUser.email))).rejects.toThrow("NEXT_REDIRECT:/register?");
    const duplicateRedirect = vi.mocked(redirectMock).mock.calls.at(-1)?.[0] ?? "";

    vi.mocked(getUsers).mockResolvedValueOnce([]);
    await expect(signUp(signupForm("new-user@example.com"))).rejects.toThrow("NEXT_REDIRECT:/register?");
    const freshRedirect = vi.mocked(redirectMock).mock.calls.at(-1)?.[0] ?? "";

    expect(duplicateRedirect).toContain(genericNotice);
    expect(freshRedirect).toContain(genericNotice);
    expect(duplicateRedirect.replace(/maria%40example\\.com|new-user%40example\\.com/g, "email")).toBe(
      freshRedirect.replace(/maria%40example\\.com|new-user%40example\\.com/g, "email"),
    );
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(createSession).not.toHaveBeenCalled();
  });
});
