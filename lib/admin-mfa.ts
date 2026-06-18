import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const adminMfaCookieName = "stayprimeph_admin_mfa";
const adminMfaMaxAgeSeconds = 10 * 60;

function safeCompareHex(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function signPendingChallengeValue(rawToken: string) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + adminMfaMaxAgeSeconds * 1000;
  const payload = `${rawToken}.${issuedAt}.${expiresAt}`;
  const signature = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function readPendingChallengeValue(value?: string) {
  if (!value) return null;
  const [rawToken, issuedAtValue, expiresAtValue, signature] = value.split(".");
  const issuedAt = Number(issuedAtValue);
  const expiresAt = Number(expiresAtValue);
  if (!rawToken || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return null;

  const payload = `${rawToken}.${issuedAtValue}.${expiresAtValue}`;
  const expected = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("hex");
  return safeCompareHex(signature, expected) ? rawToken : null;
}

export function createAdminMfaCode(rawToken: string) {
  const digest = createHmac("sha256", env.AUTH_SECRET).update(`admin-mfa:${rawToken}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export function isAdminMfaCodeValid(rawToken: string, submittedCode: string) {
  const normalized = submittedCode.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  const actual = Buffer.from(normalized);
  const expected = Buffer.from(createAdminMfaCode(rawToken));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createPendingAdminMfaChallenge(rawToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(adminMfaCookieName, signPendingChallengeValue(rawToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/login",
    maxAge: adminMfaMaxAgeSeconds,
  });
}

export async function readPendingAdminMfaChallenge() {
  const cookieStore = await cookies();
  return readPendingChallengeValue(cookieStore.get(adminMfaCookieName)?.value);
}

export async function clearPendingAdminMfaChallenge() {
  const cookieStore = await cookies();
  cookieStore.set(adminMfaCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/login",
    maxAge: 0,
  });
}
