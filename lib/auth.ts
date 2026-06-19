import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionInDatabase, deleteSessionFromDatabase, deleteSessionsForUserFromDatabase, findSessionFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { getUserById } from "@/lib/users";
import type { AuthSession, User, UserRole } from "@/lib/types";

const sessionCookieName = "stayprimeph_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;
const bcryptCost = 12;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function readSessionToken(value?: string) {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) return null;
  return value;
}

async function persistSession(session: AuthSession) {
  if (usesPrismaPersistence()) return createSessionInDatabase(session);

  const activeSessions = (await readStoredSessions()).filter((item) => item.expiresAt > new Date().toISOString());
  await writeStoredSessions([session, ...activeSessions]);
}

async function getSession(token: string) {
  const sessionHash = hashSessionToken(token);
  if (usesPrismaPersistence()) return findSessionFromDatabase(sessionHash);

  const sessions = await readStoredSessions();
  const session = sessions.find((item) => item.sessionHash === sessionHash);
  if (!session) return null;
  if (session.expiresAt <= new Date().toISOString()) {
    await writeStoredSessions(sessions.filter((item) => item.id !== session.id));
    return null;
  }
  return session;
}

async function deleteSession(token: string) {
  const sessionHash = hashSessionToken(token);
  if (usesPrismaPersistence()) return deleteSessionFromDatabase(sessionHash);

  const sessions = await readStoredSessions();
  await writeStoredSessions(sessions.filter((item) => item.sessionHash !== sessionHash));
}

export async function clearAllSessionsForUser(userId: string) {
  if (usesPrismaPersistence()) return deleteSessionsForUserFromDatabase(userId);

  const sessions = await readStoredSessions();
  await writeStoredSessions(sessions.filter((item) => item.userId !== userId));
}

export function hashPassword(password: string) {
  return hashSync(password, bcryptCost);
}

export function verifyPassword(password: string, passwordHash?: string) {
  if (!passwordHash) return false;
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2y$")) {
    try {
      return compareSync(password, passwordHash);
    } catch {
      return false;
    }
  }

  const [salt, expected] = passwordHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const now = new Date();
  await persistSession({
    id: randomUUID(),
    userId,
    sessionHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + sessionMaxAgeSeconds * 1000).toISOString(),
    createdAt: now.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, sessionCookieOptions(sessionMaxAgeSeconds));
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  if (token) await deleteSession(token);
  cookieStore.set(sessionCookieName, "", sessionCookieOptions(0));
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  const passwordChangedAt = user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0;
  return passwordChangedAt && new Date(session.createdAt).getTime() < passwordChangedAt ? null : user;
});

type RequireUserOptions = {
  redirectTo?: string;
  message?: string;
};

type RequireRoleOptions = RequireUserOptions & {
  forbiddenRedirectTo?: string;
  forbiddenMessage?: string;
  roleRedirects?: Partial<Record<UserRole, string>>;
};

export async function requireUser(options: RequireUserOptions = {}) {
  const user = await getCurrentUser();
  if (user) return user;
  if (options.redirectTo) redirect(options.redirectTo);
  throw new Error(options.message ?? "Please sign in to continue.");
}

export async function requireRole(role: UserRole | UserRole[], options: RequireRoleOptions = {}) {
  const user = await requireUser(options);
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (allowedRoles.includes(user.role)) return user;

  const roleRedirect = options.roleRedirects?.[user.role];
  if (roleRedirect) redirect(roleRedirect);
  if (options.forbiddenRedirectTo) redirect(options.forbiddenRedirectTo);

  const label = allowedRoles.length === 1 ? allowedRoles[0] : allowedRoles.join(" or ");
  throw new Error(options.forbiddenMessage ?? `Use a ${label} account to continue.`);
}

export function isEmailVerified(user: Pick<User, "emailVerifiedAt">) {
  return Boolean(user.emailVerifiedAt);
}

export function requireVerifiedEmail(user: Pick<User, "emailVerifiedAt">) {
  if (!isEmailVerified(user)) {
    throw new Error("Verify your email address before using this feature.");
  }
}

export function roleHome(role: UserRole) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "host") return "/host/dashboard";
  return "/guest/dashboard";
}
