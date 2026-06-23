import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth-token-store", () => ({
  readStoredAuthTokens: vi.fn(),
  writeStoredAuthTokens: vi.fn(),
}));

vi.mock("@/lib/json-store", () => ({
  readJsonStore: vi.fn(),
  writeJsonStore: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  completeUserEmailChangeInDatabase: vi.fn(),
  consumeAuthTokenFromDatabase: vi.fn(),
  consumeEmailVerificationTokenByCodeHashInDatabase: vi.fn(),
  createAuthTokenInDatabase: vi.fn(),
  deleteAuthTokensForUserInDatabase: vi.fn(),
  deleteSessionsForUserFromDatabase: vi.fn(),
  findAuthTokenFromDatabase: vi.fn(),
  markUserEmailVerifiedInDatabase: vi.fn(),
  updateUserPasswordInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/session-store", () => ({
  readStoredSessions: vi.fn(async () => []),
  writeStoredSessions: vi.fn(),
}));

vi.mock("@/lib/user-store", () => ({
  readStoredUsers: vi.fn(),
  writeStoredUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserById: vi.fn(),
}));

import { appendAuditLog } from "@/lib/audit-logs";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import { completeEmailChange, consumeEmailVerificationCode, issueAuthToken, updateUserPassword } from "@/lib/auth-tokens";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import type { AuthToken, User } from "@/lib/types";

const user: User = {
  id: "user-1",
  name: "Prime User",
  email: "old@example.com",
  role: "guest",
  avatar: "PU",
  phone: "",
  createdAt: "2026-06-18",
};

describe("email change auth tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces earlier pending email-change tokens for the same user", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const oldEmailChangeToken: AuthToken = {
      id: "old-token",
      userId: user.id,
      tokenHash: "old-hash",
      type: "email_change",
      expiresAt: future,
      createdAt: new Date().toISOString(),
      metadata: { oldEmail: "old@example.com", newEmail: "first@example.com" },
    };
    const passwordResetToken: AuthToken = {
      ...oldEmailChangeToken,
      id: "reset-token",
      tokenHash: "reset-hash",
      type: "password_reset",
    };

    vi.mocked(readStoredAuthTokens).mockResolvedValue([oldEmailChangeToken, passwordResetToken]);

    await issueAuthToken(user.id, "email_change", { oldEmail: "old@example.com", newEmail: "new@example.com" });

    const [storedTokens] = vi.mocked(writeStoredAuthTokens).mock.calls[0];
    expect(storedTokens).toHaveLength(2);
    expect(storedTokens[0]).toMatchObject({
      userId: user.id,
      type: "email_change",
      metadata: { oldEmail: "old@example.com", newEmail: "new@example.com" },
    });
    expect(storedTokens).not.toContainEqual(expect.objectContaining({ id: "old-token" }));
    expect(storedTokens).toContainEqual(passwordResetToken);
  });

  it("replaces earlier pending account-deletion tokens for the same user", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const oldDeletionToken: AuthToken = {
      id: "old-delete-token",
      userId: user.id,
      tokenHash: "old-delete-hash",
      type: "account_deletion",
      expiresAt: future,
      createdAt: new Date().toISOString(),
      metadata: { requestedAt: "2026-06-18T00:00:00.000Z" },
    };
    const passwordResetToken: AuthToken = {
      ...oldDeletionToken,
      id: "reset-token",
      tokenHash: "reset-hash",
      type: "password_reset",
    };

    vi.mocked(readStoredAuthTokens).mockResolvedValue([oldDeletionToken, passwordResetToken]);

    await issueAuthToken(user.id, "account_deletion", { requestedAt: "2026-06-18T01:00:00.000Z" });

    const [storedTokens] = vi.mocked(writeStoredAuthTokens).mock.calls[0];
    expect(storedTokens).toHaveLength(2);
    expect(storedTokens[0]).toMatchObject({
      userId: user.id,
      type: "account_deletion",
      metadata: { requestedAt: "2026-06-18T01:00:00.000Z" },
    });
    expect(storedTokens).not.toContainEqual(expect.objectContaining({ id: "old-delete-token" }));
    expect(storedTokens).toContainEqual(passwordResetToken);
  });

  it("updates the login email only after a valid new-email token is consumed", async () => {
    vi.mocked(readStoredUsers).mockResolvedValue([user]);
    vi.mocked(readJsonStore).mockResolvedValue([
      { userId: user.id, personalInfo: { email: "old@example.com", legalName: "Prime User" } },
    ]);

    const changed = await completeEmailChange({
      id: "token-1",
      userId: user.id,
      tokenHash: "hash",
      type: "email_change",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      metadata: { oldEmail: "old@example.com", newEmail: "new@example.com" },
    });

    expect(changed).toBe(true);
    expect(vi.mocked(writeStoredUsers).mock.calls[0][0][0]).toMatchObject({
      id: user.id,
      email: "new@example.com",
    });
    expect(vi.mocked(writeStoredUsers).mock.calls[0][0][0].emailVerifiedAt).toEqual(expect.any(String));
    expect(vi.mocked(writeJsonStore).mock.calls[0][1][0]).toMatchObject({
      userId: user.id,
      personalInfo: { email: "new@example.com", legalName: "Prime User" },
    });
    expect(writeStoredSessions).toHaveBeenCalledWith([]);
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: user.id,
      actorRole: "guest",
      action: "account.email_changed",
      entityType: "user",
      entityId: user.id,
      metadata: expect.objectContaining({
        oldEmailHash: expect.any(String),
        newEmailHash: expect.any(String),
        sessionsRevoked: true,
      }),
    }));
    expect(vi.mocked(appendAuditLog).mock.calls[0][0].metadata).not.toHaveProperty("oldEmail");
    expect(vi.mocked(appendAuditLog).mock.calls[0][0].metadata).not.toHaveProperty("newEmail");
  });

  it("consumes a matching pending email verification code token once", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const verificationToken: AuthToken = {
      id: "verify-token",
      userId: user.id,
      tokenHash: "verify-hash",
      type: "email_verification",
      expiresAt: future,
      createdAt: new Date().toISOString(),
      metadata: { codeHash: "code-hash" },
    };
    const passwordResetToken: AuthToken = {
      ...verificationToken,
      id: "reset-token",
      tokenHash: "reset-hash",
      type: "password_reset",
      metadata: undefined,
    };

    vi.mocked(readStoredAuthTokens).mockResolvedValue([verificationToken, passwordResetToken]);

    const consumed = await consumeEmailVerificationCode(user.id, "code-hash");

    expect(consumed).toEqual(verificationToken);
    expect(writeStoredAuthTokens).toHaveBeenCalledWith([passwordResetToken]);
  });

  it("rejects stale email-change tokens if the account email no longer matches", async () => {
    vi.mocked(readStoredUsers).mockResolvedValue([{ ...user, email: "other@example.com" }]);

    const changed = await completeEmailChange({
      id: "token-1",
      userId: user.id,
      tokenHash: "hash",
      type: "email_change",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      metadata: { oldEmail: "old@example.com", newEmail: "new@example.com" },
    });

    expect(changed).toBe(false);
    expect(writeStoredUsers).not.toHaveBeenCalled();
    expect(writeJsonStore).not.toHaveBeenCalled();
    expect(writeStoredSessions).not.toHaveBeenCalled();
  });

  it("revokes sessions after changing a password", async () => {
    vi.mocked(readStoredUsers).mockResolvedValue([user]);
    vi.mocked(readStoredSessions).mockResolvedValue([
      {
        id: "session-1",
        userId: user.id,
        sessionHash: "hash-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: "session-2",
        userId: "other-user",
        sessionHash: "hash-2",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);

    await updateUserPassword(user.id, "new-password-hash");

    expect(vi.mocked(writeStoredUsers).mock.calls[0][0][0]).toMatchObject({
      id: user.id,
      passwordHash: "new-password-hash",
      passwordChangedAt: expect.any(String),
    });
    expect(writeStoredSessions).toHaveBeenCalledWith([
      expect.objectContaining({ id: "session-2", userId: "other-user" }),
    ]);
  });
});
