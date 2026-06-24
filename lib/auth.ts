import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  createSessionInDatabase,
  deleteSessionByIdForUserFromDatabase,
  deleteSessionFromDatabase,
  deleteSessionsForUserExceptFromDatabase,
  deleteSessionsForUserFromDatabase,
  findSessionFromDatabase,
  listSessionsForUserFromDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { getUserById } from "@/lib/users";
import type { AuthSession, User, UserRole } from "@/lib/types";

const sessionCookieName = "stayprimeph_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;
const bcryptCost = 12;
const sessionUserAgentMaxLength = 300;

type SessionMetadata = {
  userAgent?: string | null;
  ipAddress?: string | null;
  mfaVerifiedAt?: string | Date | null;
  mfaRole?: UserRole | null;
};

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

function normalizeSessionText(value?: string | null, maxLength = 160) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function redactIpAddress(value?: string | null) {
  const ip = value?.split(",")[0]?.trim();
  if (!ip) return undefined;
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.x.x`;
  const ipv6Parts = ip.split(":").filter(Boolean);
  if (ipv6Parts.length >= 2) return `${ipv6Parts[0]}:${ipv6Parts[1]}::`;
  return "Redacted";
}

export function sessionMetadataFromHeaders(headers: Headers, overrides: SessionMetadata = {}): SessionMetadata {
  return {
    userAgent: normalizeSessionText(headers.get("user-agent"), sessionUserAgentMaxLength),
    ipAddress: redactIpAddress(headers.get("x-forwarded-for") ?? headers.get("x-real-ip")),
    ...overrides,
  };
}

function normalizeSessionMetadata(input: SessionMetadata = {}) {
  return {
    userAgent: normalizeSessionText(input.userAgent, sessionUserAgentMaxLength),
    ipAddress: normalizeSessionText(input.ipAddress, 80),
    mfaVerifiedAt: input.mfaVerifiedAt instanceof Date ? input.mfaVerifiedAt.toISOString() : normalizeSessionText(input.mfaVerifiedAt, 40),
    mfaRole: input.mfaRole === "admin" || input.mfaRole === "host" || input.mfaRole === "guest" ? input.mfaRole : undefined,
  };
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
  const lastSeenAt = new Date().toISOString();
  await writeStoredSessions(sessions.map((item) => item.id === session.id ? { ...item, lastSeenAt } : item));
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

export async function clearAllSessionsForUserExceptCurrent(userId: string) {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  if (!token) return clearAllSessionsForUser(userId);
  const sessionHash = hashSessionToken(token);
  if (usesPrismaPersistence()) return deleteSessionsForUserExceptFromDatabase(userId, sessionHash);

  const sessions = await readStoredSessions();
  await writeStoredSessions(sessions.filter((item) => item.userId !== userId || item.sessionHash === sessionHash));
}

export async function listActiveSessionsForUser(userId: string) {
  const now = new Date().toISOString();
  if (usesPrismaPersistence()) return listSessionsForUserFromDatabase(userId);

  const sessions = await readStoredSessions();
  const activeSessions = sessions.filter((item) => item.expiresAt > now);
  if (activeSessions.length !== sessions.length) await writeStoredSessions(activeSessions);
  return activeSessions
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeSessionForUser(userId: string, sessionId: string) {
  if (usesPrismaPersistence()) return deleteSessionByIdForUserFromDatabase(userId, sessionId);

  const sessions = await readStoredSessions();
  await writeStoredSessions(sessions.filter((item) => item.userId !== userId || item.id !== sessionId));
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

export async function createSession(userId: string, metadata: SessionMetadata = {}) {
  const token = createSessionToken();
  const now = new Date();
  const normalizedMetadata = normalizeSessionMetadata(metadata);
  await persistSession({
    id: randomUUID(),
    userId,
    sessionHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + sessionMaxAgeSeconds * 1000).toISOString(),
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    ...normalizedMetadata,
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

export async function getCurrentAuthSession() {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  return token ? getSession(token) : null;
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
