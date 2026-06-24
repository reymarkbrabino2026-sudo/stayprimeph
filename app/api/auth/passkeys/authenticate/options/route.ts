import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createPasskeyAuthenticationOptions, passkeyRpConfig, safePasskeyNextPath, setPasskeyChallenge } from "@/lib/passkeys";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";
import { getUsers } from "@/lib/users";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error && error.message ? error.message : "Passkey sign-in could not start.";
  return NextResponse.json({ error: message }, { status });
}

function requestedRole(value: unknown): UserRole | undefined {
  return value === "admin" || value === "host" || value === "guest" ? value : undefined;
}

export async function POST(request: Request) {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({})) as { email?: string; requestedRole?: string; nextPath?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = requestedRole(body.requestedRole);
    const ip = headerStore.get("x-forwarded-for");
    const rateLimit = await checkDistributedRateLimit(rateLimitKey("passkey-auth-options", email || "discoverable", ip), 12, 10 * 60_000);
    if (rateLimit.limited) return NextResponse.json({ error: "Too many passkey sign-in attempts. Please try again later." }, { status: 429 });

    const users = email ? await getUsers() : [];
    const user = email ? users.find((item) => item.email.toLowerCase() === email) : undefined;
    if (email && !user) throw new Error("No passkey is available for that account.");
    if (user && role && user.role !== role) throw new Error(`Use a ${role} account to continue.`);

    const rp = passkeyRpConfig(headerStore);
    const options = await createPasskeyAuthenticationOptions({ rp, userId: user?.id });
    if (user && !options.allowCredentials?.length) throw new Error("No passkey is available for that account.");

    await setPasskeyChallenge({
      type: "authentication",
      challenge: options.challenge,
      userId: user?.id,
      requestedRole: role,
      nextPath: safePasskeyNextPath(body.nextPath),
    });
    return NextResponse.json({ options });
  } catch (error) {
    return jsonError(error);
  }
}
