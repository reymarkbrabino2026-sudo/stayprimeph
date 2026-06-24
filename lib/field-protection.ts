import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const encryptedFieldMarker = "stayprimeph.field-encryption";
const encryptedFieldVersion = 1;

export type EncryptedFieldValue = {
  __protected: typeof encryptedFieldMarker;
  version: typeof encryptedFieldVersion;
  algorithm: "aes-256-gcm";
  keyId: "primary";
  purpose: string;
  iv: string;
  tag: string;
  ciphertext: string;
  encryptedAt: string;
};

function protectionSecret() {
  return env.FIELD_LEVEL_ENCRYPTION_KEY || env.AUTH_SECRET;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`stayprimeph-field-encryption-v1:${protectionSecret()}`)
    .digest();
}

function aadForPurpose(purpose: string) {
  return Buffer.from(`stayprimeph:${purpose}:v1`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function isEncryptedFieldValue(value: unknown): value is EncryptedFieldValue {
  return isRecord(value)
    && value.__protected === encryptedFieldMarker
    && value.version === encryptedFieldVersion
    && value.algorithm === "aes-256-gcm"
    && value.keyId === "primary"
    && typeof value.purpose === "string"
    && typeof value.iv === "string"
    && typeof value.tag === "string"
    && typeof value.ciphertext === "string";
}

export function encryptFieldValue(value: string, purpose: string): EncryptedFieldValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(aadForPurpose(purpose));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    __protected: encryptedFieldMarker,
    version: encryptedFieldVersion,
    algorithm: "aes-256-gcm",
    keyId: "primary",
    purpose,
    iv: base64Url(iv),
    tag: base64Url(tag),
    ciphertext: base64Url(ciphertext),
    encryptedAt: new Date().toISOString(),
  };
}

export function decryptFieldValue(value: unknown, purpose: string) {
  if (!isEncryptedFieldValue(value) || value.purpose !== purpose) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), fromBase64Url(value.iv));
    decipher.setAAD(aadForPurpose(purpose));
    decipher.setAuthTag(fromBase64Url(value.tag));
    return Buffer.concat([decipher.update(fromBase64Url(value.ciphertext)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function protectedTextForStorage(value: string, purpose: string) {
  const trimmed = value.trim();
  return trimmed ? encryptFieldValue(trimmed, purpose) : "";
}

export function publicProtectedText(value: unknown, purpose: string) {
  const decrypted = decryptFieldValue(value, purpose);
  if (decrypted !== null) return decrypted;
  return typeof value === "string" ? value : "";
}

export function fieldNeedsEncryption(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function canonicalTokenValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function fieldToken(value: string, purpose: string) {
  return createHmac("sha256", protectionSecret())
    .update(`stayprimeph-${purpose}-v1:${value}`)
    .digest("hex");
}

export function tokensMatch(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
