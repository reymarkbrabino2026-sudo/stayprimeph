import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  clearAllSessionsForUser: vi.fn(),
  clearSession: vi.fn(),
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
  requireVerifiedEmail: vi.fn((user: { emailVerifiedAt?: string }) => {
    if (!user.emailVerifiedAt) throw new Error("Verify your email address before using this feature.");
  }),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  assertValidCsrfForm: vi.fn(),
  assertValidCsrfToken: vi.fn(),
  csrfFieldName: "csrfToken",
  getCsrfToken: vi.fn(async () => "csrf-test-token"),
  invalidCsrfMessage: "Request token could not be verified.",
}));

vi.mock("@/lib/repositories", () => ({
  updateUserRoleInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(),
  writeStoredUsers: vi.fn(),
}));

import { continueAsHost } from "@/app/become-a-host/upgrade/actions";
import { clearAllSessionsForUser, clearSession, requireUser } from "@/lib/auth";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import type { User } from "@/lib/types";

const guestUser: User = {
  id: "guest-1",
  name: "Guest User",
  email: "guest@example.com",
  role: "guest",
  avatar: "GU",
  phone: "",
  createdAt: "2026-06-18",
  emailVerifiedAt: "2026-06-18T00:00:00.000Z",
};

describe("host role upgrade session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes sessions and forces reauth after a guest becomes a host", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(guestUser);
    vi.mocked(readStoredUsers).mockResolvedValueOnce([guestUser]);

    await expect(continueAsHost(new FormData())).rejects.toThrow("NEXT_REDIRECT:/login?role=host&message=Your%20host%20access%20was%20updated.%20Please%20log%20in%20again.");

    expect(writeStoredUsers).toHaveBeenCalledWith([
      expect.objectContaining({ id: guestUser.id, role: "host" }),
    ]);
    expect(clearAllSessionsForUser).toHaveBeenCalledWith(guestUser.id);
    expect(clearSession).toHaveBeenCalled();
  });
});
