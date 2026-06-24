import { type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminMfaCode, createPendingAdminMfaChallenge } from "@/lib/admin-mfa";
import { createSession, roleHome, sessionMetadataFromHeaders } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { sendPrivilegedMfaEmail } from "@/lib/email";
import {
  clearPasskeyChallenge,
  passkeyRpConfig,
  readPasskeyChallenge,
  verifyPasskeyAuthentication,
} from "@/lib/passkeys";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";
import type { User } from "@/lib/types";
import { getUserById } from "@/lib/users";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error && error.message ? error.message : "Passkey sign-in could not be verified.";
  return NextResponse.json({ error: message }, { status });
}

function finalRedirectForUser(user: User, nextPath?: string) {
  if (user.role === "admin") return nextPath?.startsWith("/admin") ? nextPath : roleHome(user.role);
  return nextPath && !nextPath.startsWith("/admin") ? nextPath : roleHome(user.role);
}

function mfaRedirectForUser(user: User, nextPath?: string) {
  if (user.role === "admin") {
    const params = new URLSearchParams({ mfa: "1", message: "Enter the 6-digit code sent to the admin email." });
    if (nextPath?.startsWith("/admin")) params.set("next", nextPath);
    return `/admin/login?${params.toString()}`;
  }

  const params = new URLSearchParams({ mfa: "1", role: "host", message: "Enter the 6-digit code sent to the host email." });
  if (nextPath && !nextPath.startsWith("/admin")) params.set("next", nextPath);
  return `/login?${params.toString()}`;
}

async function startPrivilegedMfa(user: User, nextPath?: string) {
  if (user.role !== "admin" && user.role !== "host") throw new Error("This account does not require privileged verification.");
  const token = await issueAuthToken(user.id, "admin_mfa");
  await createPendingAdminMfaChallenge(token);
  await sendPrivilegedMfaEmail({
    to: user.email,
    name: user.name,
    code: createAdminMfaCode(token),
    role: user.role,
  });
  return mfaRedirectForUser(user, nextPath);
}

export async function POST(request: Request) {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("passkey-auth-verify", headerStore.get("x-forwarded-for")), 12, 10 * 60_000);
  if (rateLimit.limited) return NextResponse.json({ error: "Too many passkey sign-in attempts. Please try again later." }, { status: 429 });

  try {
    const challenge = await readPasskeyChallenge("authentication");
    await clearPasskeyChallenge();
    if (!challenge) throw new Error("Passkey sign-in expired. Start again.");

    const body = await request.json() as { response?: AuthenticationResponseJSON };
    if (!body.response) throw new Error("Passkey response is required.");

    const rp = passkeyRpConfig(headerStore);
    const passkey = await verifyPasskeyAuthentication({
      response: body.response,
      expectedChallenge: challenge.challenge,
      rp,
      expectedUserId: challenge.userId,
    });

    const user = await getUserById(passkey.userId);
    if (!user) throw new Error("This passkey is not linked to an active account.");
    if (challenge.requestedRole && user.role !== challenge.requestedRole) throw new Error(`Use a ${challenge.requestedRole} account to continue.`);
    if (!user.emailVerifiedAt) throw new Error("Verify your email address before logging in.");

    if (user.role === "admin" || user.role === "host") {
      const redirectUrl = await startPrivilegedMfa(user, challenge.nextPath);
      return NextResponse.json({ ok: true, redirectUrl });
    }

    await createSession(user.id, sessionMetadataFromHeaders(headerStore));
    return NextResponse.json({ ok: true, redirectUrl: finalRedirectForUser(user, challenge.nextPath) });
  } catch (error) {
    return jsonError(error);
  }
}
