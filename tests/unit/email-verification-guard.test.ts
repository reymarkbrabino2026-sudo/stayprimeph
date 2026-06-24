import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  createSessionInDatabase: vi.fn(),
  deleteSessionByIdForUserFromDatabase: vi.fn(),
  deleteSessionFromDatabase: vi.fn(),
  deleteSessionsForUserExceptFromDatabase: vi.fn(),
  deleteSessionsForUserFromDatabase: vi.fn(),
  findSessionFromDatabase: vi.fn(),
  listSessionsForUserFromDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/session-store", () => ({
  readStoredSessions: vi.fn(),
  writeStoredSessions: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
}));

import { isEmailVerified, requireVerifiedEmail } from "@/lib/auth";

describe("verified email guard", () => {
  it("accepts users with a verified email timestamp", () => {
    const user = { emailVerifiedAt: "2026-06-18T00:00:00.000Z" };

    expect(isEmailVerified(user)).toBe(true);
    expect(() => requireVerifiedEmail(user)).not.toThrow();
  });

  it("rejects users without verified email", () => {
    const user = { emailVerifiedAt: undefined };

    expect(isEmailVerified(user)).toBe(false);
    expect(() => requireVerifiedEmail(user)).toThrow("Verify your email address before using this feature.");
  });
});
