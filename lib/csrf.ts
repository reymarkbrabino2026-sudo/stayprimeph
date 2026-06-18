import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { csrfFieldName } from "@/lib/csrf-fields";
import { env } from "@/lib/env";

const sessionCookieName = "stayprimeph_session";
export const invalidCsrfMessage = "Request token could not be verified.";
export { csrfFieldName };

function signCsrf(sessionToken: string) {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function getCsrfToken() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;
  return sessionToken ? signCsrf(sessionToken) : "";
}

export async function assertValidCsrfToken(token: FormDataEntryValue | string | null | undefined) {
  const submitted = typeof token === "string" ? token : "";
  const expected = await getCsrfToken();
  if (!submitted || !expected || !safeEqual(submitted, expected)) {
    throw new Error(invalidCsrfMessage);
  }
}

export async function assertValidCsrfForm(formData: FormData) {
  await assertValidCsrfToken(formData.get(csrfFieldName));
}
