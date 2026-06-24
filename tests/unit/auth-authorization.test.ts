import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cookieStore, redirectMock } = vi.hoisted(() => {
  let cookieValue: string | undefined;
  return {
    cookieStore: {
      get: vi.fn(() => (cookieValue ? { value: cookieValue } : undefined)),
      set: vi.fn((_name: string, value: string) => {
        cookieValue = value || undefined;
      }),
      reset: () => {
        cookieValue = undefined;
      },
    },
    redirectMock: vi.fn((target: string) => {
      throw new Error(`NEXT_REDIRECT:${target}`);
    }),
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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

import { hashSessionToken, requireRole, requireUser } from "@/lib/auth";
import { readStoredSessions } from "@/lib/session-store";
import { getUserById } from "@/lib/users";
import type { AuthSession, User } from "@/lib/types";

const user: User = {
  id: "user-1",
  name: "Prime User",
  email: "prime@example.com",
  role: "host",
  avatar: "PU",
  phone: "",
  createdAt: "2026-06-18",
};

function sessionFor(token: string): AuthSession {
  return {
    id: "session-1",
    userId: user.id,
    sessionHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function mockSignedInUser(nextUser: User = user) {
  const token = "a".repeat(64);
  cookieStore.set("stayprimeph_session", token);
  vi.mocked(readStoredSessions).mockResolvedValueOnce([sessionFor(token)]);
  vi.mocked(getUserById).mockResolvedValueOnce(nextUser);
}

describe("authorization helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.reset();
  });

  it("throws a shared authentication error when no user is signed in", async () => {
    await expect(requireUser()).rejects.toThrow("Please sign in to continue.");
  });

  it("redirects unauthenticated users when a login target is provided", async () => {
    await expect(requireUser({ redirectTo: "/login" })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("returns the current user when the required role matches", async () => {
    mockSignedInUser();

    await expect(requireRole("host")).resolves.toMatchObject({ id: user.id, role: "host" });
  });

  it("throws the provided forbidden message when the role does not match", async () => {
    mockSignedInUser({ ...user, role: "guest" });

    await expect(requireRole("admin", { forbiddenMessage: "Only admins can continue." })).rejects.toThrow("Only admins can continue.");
  });

  it("denies a guest account from host-only access", async () => {
    mockSignedInUser({ ...user, role: "guest" });

    await expect(requireRole("host", { forbiddenMessage: "Only hosts can continue." })).rejects.toThrow("Only hosts can continue.");
  });

  it("denies a guest account from admin-only access", async () => {
    mockSignedInUser({ ...user, role: "guest" });

    await expect(requireRole("admin", { forbiddenMessage: "Only admins can continue." })).rejects.toThrow("Only admins can continue.");
  });

  it("denies a host account from admin-only access", async () => {
    mockSignedInUser({ ...user, role: "host" });

    await expect(requireRole("admin", { forbiddenMessage: "Only admins can continue." })).rejects.toThrow("Only admins can continue.");
  });

  it("supports role-specific redirects", async () => {
    mockSignedInUser({ ...user, role: "guest" });

    await expect(requireRole(["host", "admin"], { roleRedirects: { guest: "/become-a-host/upgrade" } })).rejects.toThrow("NEXT_REDIRECT:/become-a-host/upgrade");
  });
});
