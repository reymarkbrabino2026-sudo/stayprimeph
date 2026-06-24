import { type RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { getCurrentUser, requireVerifiedEmail } from "@/lib/auth";
import {
  clearPasskeyChallenge,
  listPasskeysForUser,
  passkeyRpConfig,
  publicPasskey,
  readPasskeyChallenge,
  verifyPasskeyRegistration,
} from "@/lib/passkeys";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error && error.message ? error.message : "Passkey setup could not be verified.";
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before adding a passkey." }, { status: 401 });

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("passkey-register-verify", user.id, guard.headers.get("x-forwarded-for")), 8, 10 * 60_000);
  if (rateLimit.limited) return NextResponse.json({ error: "Too many passkey setup attempts. Please try again later." }, { status: 429 });

  try {
    requireVerifiedEmail(user);
    const challenge = await readPasskeyChallenge("registration");
    await clearPasskeyChallenge();
    if (!challenge || challenge.userId !== user.id) throw new Error("Passkey setup expired. Start again.");

    const body = await request.json() as { response?: RegistrationResponseJSON; name?: string };
    if (!body.response) throw new Error("Passkey response is required.");

    const rp = passkeyRpConfig(guard.headers);
    const passkey = await verifyPasskeyRegistration({
      user,
      response: body.response,
      expectedChallenge: challenge.challenge,
      rp,
      name: body.name,
    });
    const passkeys = await listPasskeysForUser(user.id);
    return NextResponse.json({ passkey: publicPasskey(passkey), passkeys: passkeys.map(publicPasskey) });
  } catch (error) {
    return jsonError(error);
  }
}
