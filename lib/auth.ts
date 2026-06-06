import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getUserById } from "@/lib/users";
import type { User, UserRole } from "@/lib/types";

const sessionCookieName = "stayprimeph_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;
const bcryptCost = 12;

function signSessionValue(userId: string) {
  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function readSignedSessionValue(value?: string) {
  if (!value) return null;
  const [userId, expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return null;
  const expected = createHmac("sha256", env.AUTH_SECRET).update(`${userId}.${expiresAtValue}`).digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer) ? userId : null;
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
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, signSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = readSignedSessionValue(cookieStore.get(sessionCookieName)?.value);
  return userId ? getUserById(userId) : null;
}

export function roleHome(role: UserRole) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "host") return "/host/dashboard";
  return "/guest/dashboard";
}
