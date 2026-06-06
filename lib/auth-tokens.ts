import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import {
  consumeAuthTokenFromDatabase,
  createAuthTokenInDatabase,
  markUserEmailVerifiedInDatabase,
  updateUserPasswordInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import type { AuthToken } from "@/lib/types";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthToken["type"]) {
  const rawToken = randomBytes(32).toString("hex");
  const token: AuthToken = {
    id: randomUUID(),
    userId,
    tokenHash: hashToken(rawToken),
    type,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (usesPrismaPersistence()) await createAuthTokenInDatabase(token);
  else await writeStoredAuthTokens([token, ...(await readStoredAuthTokens()).filter((item) => item.expiresAt > new Date().toISOString())]);
  return rawToken;
}

export async function consumeAuthToken(rawToken: string, type: AuthToken["type"]) {
  const tokenHash = hashToken(rawToken);
  if (usesPrismaPersistence()) return consumeAuthTokenFromDatabase(tokenHash, type);
  const tokens = await readStoredAuthTokens();
  const token = tokens.find((item) => item.tokenHash === tokenHash && item.type === type && item.expiresAt > new Date().toISOString());
  await writeStoredAuthTokens(tokens.filter((item) => item.id !== token?.id));
  return token ?? null;
}

export async function markUserEmailVerified(userId: string) {
  if (usesPrismaPersistence()) return markUserEmailVerifiedInDatabase(userId);
  const users = await readStoredUsers();
  await writeStoredUsers(users.map((user) => user.id === userId ? { ...user, emailVerifiedAt: new Date().toISOString() } : user));
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  if (usesPrismaPersistence()) return updateUserPasswordInDatabase(userId, passwordHash);
  const users = await readStoredUsers();
  await writeStoredUsers(users.map((user) => user.id === userId ? { ...user, passwordHash } : user));
}
