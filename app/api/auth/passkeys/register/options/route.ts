import { NextResponse } from "next/server";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { getCurrentUser, requireVerifiedEmail } from "@/lib/auth";
import { createPasskeyRegistrationOptions, passkeyRpConfig, setPasskeyChallenge } from "@/lib/passkeys";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error && error.message ? error.message : "Passkey setup could not start.";
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before adding a passkey." }, { status: 401 });

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("passkey-register-options", user.id, guard.headers.get("x-forwarded-for")), 8, 10 * 60_000);
  if (rateLimit.limited) return NextResponse.json({ error: "Too many passkey setup attempts. Please try again later." }, { status: 429 });

  try {
    requireVerifiedEmail(user);
    const rp = passkeyRpConfig(guard.headers);
    const options = await createPasskeyRegistrationOptions(user, rp);
    await setPasskeyChallenge({ type: "registration", challenge: options.challenge, userId: user.id });
    return NextResponse.json({ options });
  } catch (error) {
    return jsonError(error);
  }
}
