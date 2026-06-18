import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cookieStore } = vi.hoisted(() => {
  let cookieValue: string | undefined;
  return {
    cookieStore: {
      get: vi.fn(() => (cookieValue ? { value: cookieValue } : undefined)),
      set: vi.fn((_name: string, value: string) => {
        cookieValue = value || undefined;
      }),
      value: () => cookieValue,
      reset: () => {
        cookieValue = undefined;
      },
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/repositories", () => ({
  createSessionInDatabase: vi.fn(),
  deleteSessionFromDatabase: vi.fn(),
  deleteSessionsForUserFromDatabase: vi.fn(),
  findSessionFromDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/session-store", () => ({
  readStoredSessions: vi.fn(),
  writeStoredSessions: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
}));

import { clearAllSessionsForUser, clearSession, createSession, getCurrentUser, hashSessionToken } from "@/lib/auth";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { getUserById } from "@/lib/users";
import type { AuthSession, User } from "@/lib/types";

const user: User = {
  id: "user-1",
  name: "Prime User",
  email: "prime@example.com",
  role: "guest",
  avatar: "PU",
  phone: "",
  createdAt: "2026-06-18",
};

function sessionForToken(token: string, overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    id: "session-1",
    userId: user.id,
    sessionHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date(Date.now() - 10_000).toISOString(),
    ...overrides,
  };
}

describe("server-side sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    cookieStore.reset();
  });

  it("creates an opaque cookie and stores only the hashed session token", async () => {
    vi.mocked(readStoredSessions).mockResolvedValueOnce([]);

    await createSession(user.id);

    const token = cookieStore.value();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "stayprimeph_session",
      token,
      {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    );

    const [storedSessions] = vi.mocked(writeStoredSessions).mock.calls[0];
    expect(storedSessions[0]).toMatchObject({
      userId: user.id,
      sessionHash: hashSessionToken(token!),
    });
    expect(JSON.stringify(storedSessions[0])).not.toContain(token);
  });

  it("marks session cookies Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(readStoredSessions).mockResolvedValueOnce([]);

    await createSession(user.id);

    const token = cookieStore.value();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "stayprimeph_session",
      token,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      }),
    );
  });

  it("requires a valid server-side session record to resolve the current user", async () => {
    const token = "a".repeat(64);
    cookieStore.set("stayprimeph_session", token);
    vi.mocked(readStoredSessions).mockResolvedValueOnce([sessionForToken(token)]);
    vi.mocked(getUserById).mockResolvedValueOnce(user);

    await expect(getCurrentUser()).resolves.toEqual(user);

    expect(getUserById).toHaveBeenCalledWith(user.id);
  });

  it("rejects expired sessions and removes them from the JSON session store", async () => {
    const token = "b".repeat(64);
    const expired = sessionForToken(token, {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    cookieStore.set("stayprimeph_session", token);
    vi.mocked(readStoredSessions).mockResolvedValueOnce([expired]);

    await expect(getCurrentUser()).resolves.toBeNull();

    expect(writeStoredSessions).toHaveBeenCalledWith([]);
  });

  it("invalidates sessions created before the user's password changed", async () => {
    const token = "c".repeat(64);
    cookieStore.set("stayprimeph_session", token);
    vi.mocked(readStoredSessions).mockResolvedValueOnce([
      sessionForToken(token, { createdAt: "2026-06-18T01:00:00.000Z" }),
    ]);
    vi.mocked(getUserById).mockResolvedValueOnce({
      ...user,
      passwordChangedAt: "2026-06-18T02:00:00.000Z",
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("deletes the current server-side session on logout", async () => {
    const token = "d".repeat(64);
    const session = sessionForToken(token);
    const otherSession = sessionForToken("e".repeat(64), { id: "session-2" });
    cookieStore.set("stayprimeph_session", token);
    vi.mocked(readStoredSessions).mockResolvedValueOnce([session, otherSession]);

    await clearSession();

    expect(writeStoredSessions).toHaveBeenCalledWith([otherSession]);
    expect(cookieStore.value()).toBeUndefined();
    expect(cookieStore.set).toHaveBeenLastCalledWith(
      "stayprimeph_session",
      "",
      {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: false,
      },
    );
  });

  it("deletes every server-side session for a user", async () => {
    const userSession = sessionForToken("f".repeat(64));
    const otherUserSession = sessionForToken("1".repeat(64), { id: "session-2", userId: "user-2" });
    vi.mocked(readStoredSessions).mockResolvedValueOnce([userSession, otherUserSession]);

    await clearAllSessionsForUser(user.id);

    expect(writeStoredSessions).toHaveBeenCalledWith([otherUserSession]);
  });
});
