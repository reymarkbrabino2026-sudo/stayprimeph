import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { appendAuditLog } from "@/lib/audit-logs";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import {
  completeUserEmailChangeInDatabase,
  consumeAuthTokenFromDatabase,
  createAuthTokenInDatabase,
  deleteAuthTokensForUserInDatabase,
  deleteSessionsForUserFromDatabase,
  findAuthTokenFromDatabase,
  markUserEmailVerifiedInDatabase,
  updateUserPasswordInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUserById } from "@/lib/users";
import type { AuthToken } from "@/lib/types";

const tokenTtlMs: Record<AuthToken["type"], number> = {
  email_verification: 1000 * 60 * 60,
  email_change: 1000 * 60 * 60,
  password_reset: 1000 * 60 * 20,
  admin_mfa: 1000 * 60 * 10,
  account_deletion: 1000 * 60 * 60 * 24,
};

type StoredAccountSettings = {
  userId: string;
  personalInfo?: unknown;
};

const accountSettingsStoreFileName = "account-settings.json";

export function hashAuthTokenValue(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function auditHash(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function revokeSessionsForUser(userId: string) {
  if (usesPrismaPersistence()) return deleteSessionsForUserFromDatabase(userId);
  const sessions = await readStoredSessions();
  await writeStoredSessions(sessions.filter((session) => session.userId !== userId));
}

export async function issueAuthToken(userId: string, type: AuthToken["type"], metadata?: Record<string, unknown>) {
  const rawToken = randomBytes(32).toString("hex");
  const token: AuthToken = {
    id: randomUUID(),
    userId,
    tokenHash: hashAuthTokenValue(rawToken),
    type,
    metadata,
    expiresAt: new Date(Date.now() + tokenTtlMs[type]).toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (usesPrismaPersistence()) {
    if (type === "email_change" || type === "admin_mfa" || type === "account_deletion") await deleteAuthTokensForUserInDatabase(userId, type);
    await createAuthTokenInDatabase(token);
  } else {
    const tokens = (await readStoredAuthTokens()).filter((item) => item.expiresAt > new Date().toISOString());
    const activeTokens = type === "email_change" || type === "admin_mfa" || type === "account_deletion" ? tokens.filter((item) => item.userId !== userId || item.type !== type) : tokens;
    await writeStoredAuthTokens([token, ...activeTokens]);
  }
  return rawToken;
}

export async function getAuthToken(rawToken: string, type: AuthToken["type"]) {
  const tokenHash = hashAuthTokenValue(rawToken);
  if (usesPrismaPersistence()) return findAuthTokenFromDatabase(tokenHash, type);
  const tokens = await readStoredAuthTokens();
  const token = tokens.find((item) => item.tokenHash === tokenHash && item.type === type);
  if (!token) return null;
  if (token.expiresAt <= new Date().toISOString()) {
    await writeStoredAuthTokens(tokens.filter((item) => item.id !== token.id));
    return null;
  }
  return token;
}

export async function consumeAuthToken(rawToken: string, type: AuthToken["type"]) {
  const tokenHash = hashAuthTokenValue(rawToken);
  if (usesPrismaPersistence()) return consumeAuthTokenFromDatabase(tokenHash, type);
  const tokens = await readStoredAuthTokens();
  const token = tokens.find((item) => item.tokenHash === tokenHash && item.type === type);
  if (!token || token.expiresAt <= new Date().toISOString()) {
    if (token) await writeStoredAuthTokens(tokens.filter((item) => item.id !== token.id));
    return null;
  }
  await writeStoredAuthTokens(tokens.filter((item) => item.id !== token.id));
  return token ?? null;
}

export async function markUserEmailVerified(userId: string) {
  if (usesPrismaPersistence()) return markUserEmailVerifiedInDatabase(userId);
  const users = await readStoredUsers();
  await writeStoredUsers(users.map((user) => user.id === userId ? { ...user, emailVerifiedAt: new Date().toISOString() } : user));
}

export async function completeEmailChange(authToken: AuthToken) {
  const oldEmail = typeof authToken.metadata?.oldEmail === "string" ? authToken.metadata.oldEmail.trim().toLowerCase() : "";
  const newEmail = typeof authToken.metadata?.newEmail === "string" ? authToken.metadata.newEmail.trim().toLowerCase() : "";
  if (!oldEmail || !isValidEmail(newEmail)) return false;

  if (usesPrismaPersistence()) {
    const user = await getUserById(authToken.userId);
    const changed = await completeUserEmailChangeInDatabase(authToken.userId, oldEmail, newEmail);
    if (changed) {
      await revokeSessionsForUser(authToken.userId);
      await appendAuditLog({
        actorId: authToken.userId,
        actorRole: user?.role ?? "system",
        action: "account.email_changed",
        entityType: "user",
        entityId: authToken.userId,
        metadata: {
          oldEmailHash: auditHash(oldEmail),
          newEmailHash: auditHash(newEmail),
          sessionsRevoked: true,
        },
      });
    }
    return changed;
  }

  const users = await readStoredUsers();
  const user = users.find((item) => item.id === authToken.userId);
  if (!user || user.email.toLowerCase() !== oldEmail) return false;
  if (users.some((item) => item.id !== authToken.userId && item.email.toLowerCase() === newEmail)) return false;

  await writeStoredUsers(users.map((item) => (
    item.id === authToken.userId ? { ...item, email: newEmail, emailVerifiedAt: new Date().toISOString() } : item
  )));

  const settings = await readJsonStore<StoredAccountSettings>(accountSettingsStoreFileName);
  await writeJsonStore(accountSettingsStoreFileName, settings.map((record) => {
    if (record.userId !== authToken.userId || !isRecord(record.personalInfo)) return record;
    return { ...record, personalInfo: { ...record.personalInfo, email: newEmail } };
  }));

  await revokeSessionsForUser(authToken.userId);
  await appendAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: "account.email_changed",
    entityType: "user",
    entityId: user.id,
    metadata: {
      oldEmailHash: auditHash(oldEmail),
      newEmailHash: auditHash(newEmail),
      sessionsRevoked: true,
    },
  });
  return true;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  if (usesPrismaPersistence()) {
    await updateUserPasswordInDatabase(userId, passwordHash);
    await revokeSessionsForUser(userId);
    return;
  }
  const users = await readStoredUsers();
  await writeStoredUsers(users.map((user) => user.id === userId ? { ...user, passwordHash, passwordChangedAt: new Date().toISOString() } : user));
  await revokeSessionsForUser(userId);
}
