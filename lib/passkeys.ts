import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { normalizeKnownAppPath } from "@/lib/canonical-paths";
import { env } from "@/lib/env";
import { readStoredPasskeys, writeStoredPasskeys } from "@/lib/passkey-store";
import {
  createPasskeyInDatabase,
  deletePasskeyForUserInDatabase,
  findPasskeyByCredentialIdFromDatabase,
  listPasskeysForUserFromDatabase,
  updatePasskeyUsageInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import { getRequestHost } from "@/lib/request-safety";
import type { Passkey, User, UserRole } from "@/lib/types";

const rpName = "StayPrimePH";
const challengeCookieName = "stayprimeph_passkey_challenge";
const challengeMaxAgeSeconds = 5 * 60;
const transportValues = new Set(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]);

export type PublicPasskey = Pick<Passkey, "id" | "name" | "transports" | "deviceType" | "backedUp" | "createdAt" | "lastUsedAt">;

type PasskeyChallenge = {
  type: "registration" | "authentication";
  challenge: string;
  userId?: string;
  requestedRole?: UserRole;
  nextPath?: string;
  expiresAt: number;
};

export type PasskeyRpConfig = {
  origin: string;
  rpID: string;
};

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function signChallengePayload(payload: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}

function encodeChallengeCookie(challenge: PasskeyChallenge) {
  const payload = Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
  return `${payload}.${signChallengePayload(payload)}`;
}

function decodeChallengeCookie(value?: string): PasskeyChallenge | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, signChallengePayload(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<PasskeyChallenge>;
    if (parsed.type !== "registration" && parsed.type !== "authentication") return null;
    if (typeof parsed.challenge !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) return null;
    return {
      type: parsed.type,
      challenge: parsed.challenge,
      userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
      requestedRole: parsed.requestedRole === "admin" || parsed.requestedRole === "host" || parsed.requestedRole === "guest" ? parsed.requestedRole : undefined,
      nextPath: typeof parsed.nextPath === "string" ? parsed.nextPath : undefined,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function setPasskeyChallenge(challenge: Omit<PasskeyChallenge, "expiresAt">) {
  const cookieStore = await cookies();
  cookieStore.set(challengeCookieName, encodeChallengeCookie({
    ...challenge,
    expiresAt: Date.now() + challengeMaxAgeSeconds * 1000,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: challengeMaxAgeSeconds,
  });
}

export async function readPasskeyChallenge(type: PasskeyChallenge["type"]) {
  const cookieStore = await cookies();
  const challenge = decodeChallengeCookie(cookieStore.get(challengeCookieName)?.value);
  return challenge?.type === type ? challenge : null;
}

export async function clearPasskeyChallenge() {
  const cookieStore = await cookies();
  cookieStore.set(challengeCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function normalizedProto(headerStore: Headers) {
  const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

function isIpHost(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

export function passkeyRpConfig(headerStore: Headers): PasskeyRpConfig {
  const originHeader = headerStore.get("origin");
  const requestHost = getRequestHost(headerStore) ?? new URL(env.NEXT_PUBLIC_APP_URL).host;
  const origin = (() => {
    if (originHeader) {
      try {
        return new URL(originHeader).origin;
      } catch {
        return null;
      }
    }
    return `${normalizedProto(headerStore)}://${requestHost}`;
  })();

  if (!origin) throw new Error("Passkey origin could not be verified.");

  const hostname = new URL(origin).hostname.toLowerCase();
  if (isIpHost(hostname)) {
    throw new Error("Passkeys require a valid domain. Use localhost for local testing or stayprimeph.com in production.");
  }

  return { origin, rpID: hostname };
}

function normalizeTransports(value: unknown): AuthenticatorTransportFuture[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const transports = value.filter((item): item is AuthenticatorTransportFuture => typeof item === "string" && transportValues.has(item));
  return transports.length ? transports : undefined;
}

function publicKeyToStorage(publicKey: Uint8Array) {
  return Buffer.from(publicKey).toString("base64url");
}

function storageToPublicKey(publicKey: string) {
  return new Uint8Array(Buffer.from(publicKey, "base64url"));
}

function toWebAuthnCredential(passkey: Passkey): WebAuthnCredential {
  return {
    id: passkey.credentialId,
    publicKey: storageToPublicKey(passkey.publicKey),
    counter: passkey.counter,
    transports: normalizeTransports(passkey.transports),
  };
}

export function sanitizePasskeyName(value: unknown) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 80) : "Passkey";
}

export function publicPasskey(passkey: Passkey): PublicPasskey {
  return {
    id: passkey.id,
    name: passkey.name,
    transports: normalizeTransports(passkey.transports),
    deviceType: passkey.deviceType,
    backedUp: passkey.backedUp,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  };
}

export function safePasskeyNextPath(value: unknown) {
  const path = String(value ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return undefined;
  return normalizeKnownAppPath(path);
}

export async function listPasskeysForUser(userId: string) {
  if (usesPrismaPersistence()) return listPasskeysForUserFromDatabase(userId);
  const passkeys = await readStoredPasskeys();
  return passkeys
    .filter((passkey) => passkey.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function findPasskeyByCredentialId(credentialId: string) {
  if (usesPrismaPersistence()) return findPasskeyByCredentialIdFromDatabase(credentialId);
  const passkeys = await readStoredPasskeys();
  return passkeys.find((passkey) => passkey.credentialId === credentialId) ?? null;
}

async function createPasskey(passkey: Passkey) {
  if (usesPrismaPersistence()) return createPasskeyInDatabase(passkey);
  const passkeys = await readStoredPasskeys();
  if (passkeys.some((item) => item.credentialId === passkey.credentialId)) throw new Error("This passkey is already added.");
  await writeStoredPasskeys([passkey, ...passkeys]);
}

export async function deletePasskeyForUser(userId: string, passkeyId: string) {
  if (usesPrismaPersistence()) return deletePasskeyForUserInDatabase(userId, passkeyId);
  const passkeys = await readStoredPasskeys();
  await writeStoredPasskeys(passkeys.filter((passkey) => passkey.userId !== userId || passkey.id !== passkeyId));
}

async function updatePasskeyUsage(credentialId: string, counter: number, deviceType: Passkey["deviceType"], backedUp: boolean) {
  if (usesPrismaPersistence()) return updatePasskeyUsageInDatabase(credentialId, counter, deviceType, backedUp);
  const now = new Date().toISOString();
  const passkeys = await readStoredPasskeys();
  await writeStoredPasskeys(passkeys.map((passkey) => (
    passkey.credentialId === credentialId
      ? { ...passkey, counter, deviceType, backedUp, lastUsedAt: now }
      : passkey
  )));
}

export async function createPasskeyRegistrationOptions(user: User, rp: PasskeyRpConfig) {
  const existing = await listPasskeysForUser(user.id);
  return generateRegistrationOptions({
    rpName,
    rpID: rp.rpID,
    userID: Buffer.from(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existing.map((passkey) => ({
      id: passkey.credentialId,
      transports: normalizeTransports(passkey.transports),
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
}

export async function verifyPasskeyRegistration({
  user,
  response,
  expectedChallenge,
  rp,
  name,
}: {
  user: User;
  response: RegistrationResponseJSON;
  expectedChallenge: string;
  rp: PasskeyRpConfig;
  name?: string;
}) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  });

  if (!verification.verified) throw new Error("Passkey verification failed. Please try again.");

  const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
  const existing = await findPasskeyByCredentialId(credential.id);
  if (existing) throw new Error("This passkey is already added.");

  const passkey: Passkey = {
    id: randomUUID(),
    userId: user.id,
    credentialId: credential.id,
    publicKey: publicKeyToStorage(credential.publicKey),
    counter: credential.counter,
    name: sanitizePasskeyName(name),
    transports: normalizeTransports(response.response.transports),
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    createdAt: new Date().toISOString(),
  };

  await createPasskey(passkey);
  return passkey;
}

export async function createPasskeyAuthenticationOptions({
  rp,
  userId,
}: {
  rp: PasskeyRpConfig;
  userId?: string;
}) {
  const passkeys = userId ? await listPasskeysForUser(userId) : [];
  return generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: userId
      ? passkeys.map((passkey) => ({
          id: passkey.credentialId,
          transports: normalizeTransports(passkey.transports),
        }))
      : undefined,
    userVerification: "required",
  });
}

export async function verifyPasskeyAuthentication({
  response,
  expectedChallenge,
  rp,
  expectedUserId,
}: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  rp: PasskeyRpConfig;
  expectedUserId?: string;
}) {
  const passkey = await findPasskeyByCredentialId(response.id);
  if (!passkey || (expectedUserId && passkey.userId !== expectedUserId)) {
    throw new Error("This passkey is not registered for that account.");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    credential: toWebAuthnCredential(passkey),
    requireUserVerification: true,
  });

  if (!verification.verified) throw new Error("Passkey sign-in could not be verified.");

  await updatePasskeyUsage(
    verification.authenticationInfo.credentialID,
    verification.authenticationInfo.newCounter,
    verification.authenticationInfo.credentialDeviceType,
    verification.authenticationInfo.credentialBackedUp,
  );
  return passkey;
}
