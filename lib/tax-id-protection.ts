import "server-only";

import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

type ProtectedIdentifier = {
  display: string;
  token: string;
  last4: string;
  protectedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function canonicalTaxIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function canonicalPayoutIdentifier(value: string) {
  return value.replace(/\D/g, "");
}

function maskLast4(last4: string) {
  return last4 ? `**** ${last4}` : "";
}

export function maskTaxIdentifier(value: string) {
  return maskLast4(canonicalTaxIdentifier(value).slice(-4));
}

export function maskPayoutIdentifier(value: string) {
  return maskLast4(canonicalPayoutIdentifier(value).slice(-4));
}

function tokenForIdentifier(canonical: string, purpose: "tax-id" | "payout-id") {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`stayprimeph-${purpose}-v1:${canonical}`)
    .digest("hex");
}

function looksMasked(value: string) {
  return value.includes("*");
}

function protectedFields(record: unknown, field: string) {
  if (!isRecord(record)) return null;
  const token = text(record[`${field}Token`]);
  const last4 = text(record[`${field}Last4`]);
  const protectedAt = text(record[`${field}ProtectedAt`]);
  if (!token || !last4) return null;
  return { token, last4, protectedAt };
}

function protectIdentifierForStorage({
  input,
  existingRecord,
  field,
  canonicalize,
  mask,
  purpose,
}: {
  input: string;
  existingRecord: unknown;
  field: string;
  canonicalize: (value: string) => string;
  mask: (value: string) => string;
  purpose: "tax-id" | "payout-id";
}): ProtectedIdentifier | null {
  const trimmedInput = input.trim();
  const existingProtected = protectedFields(existingRecord, field);

  if (looksMasked(trimmedInput) && existingProtected) {
    return {
      display: mask(existingProtected.last4),
      token: existingProtected.token,
      last4: existingProtected.last4,
      protectedAt: existingProtected.protectedAt || new Date().toISOString(),
    };
  }

  const existingRaw = isRecord(existingRecord) ? text(existingRecord[field]) : "";
  const source = looksMasked(trimmedInput) && existingRaw && !looksMasked(existingRaw) ? existingRaw : trimmedInput;
  const canonical = canonicalize(source);
  if (!canonical) return null;

  const last4 = canonical.slice(-4);
  return {
    display: mask(canonical),
    token: tokenForIdentifier(canonical, purpose),
    last4,
    protectedAt: new Date().toISOString(),
  };
}

export function protectTaxIdentifierForStorage(input: string, existingRecord: unknown, field: string) {
  return protectIdentifierForStorage({
    input,
    existingRecord,
    field,
    canonicalize: canonicalTaxIdentifier,
    mask: maskTaxIdentifier,
    purpose: "tax-id",
  });
}

export function protectPayoutIdentifierForStorage(input: string, existingRecord: unknown, field: string) {
  return protectIdentifierForStorage({
    input,
    existingRecord,
    field,
    canonicalize: canonicalPayoutIdentifier,
    mask: maskPayoutIdentifier,
    purpose: "payout-id",
  });
}

function publicIdentifier(record: unknown, field: string, mask: (value: string) => string) {
  if (!isRecord(record)) return "";
  const protectedLast4 = text(record[`${field}Last4`]);
  if (protectedLast4) return mask(protectedLast4);
  const value = text(record[field]);
  return looksMasked(value) ? value : mask(value);
}

export function publicTaxIdentifier(record: unknown, field: string) {
  return publicIdentifier(record, field, maskTaxIdentifier);
}

export function publicPayoutIdentifier(record: unknown, field: string) {
  return publicIdentifier(record, field, maskPayoutIdentifier);
}

export function identifierNeedsProtection(record: unknown, field: string) {
  if (!isRecord(record)) return false;
  const value = text(record[field]);
  if (!value) return false;
  return !text(record[`${field}Token`]) || !looksMasked(value);
}

export const taxIdentifierNeedsProtection = identifierNeedsProtection;
export const payoutIdentifierNeedsProtection = identifierNeedsProtection;
