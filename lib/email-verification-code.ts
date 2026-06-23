import "server-only";

import { createHmac, randomInt } from "node:crypto";
import { env } from "@/lib/env";

export function createEmailVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeEmailVerificationCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function hashEmailVerificationCode(input: { userId: string; email: string; code: string }) {
  const email = input.email.trim().toLowerCase();
  const code = normalizeEmailVerificationCode(input.code);
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`email-verification:${input.userId}:${email}:${code}`)
    .digest("hex");
}
