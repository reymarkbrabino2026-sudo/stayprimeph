import { NextResponse } from "next/server";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { getCurrentUser } from "@/lib/auth";
import { deletePasskeyForUser, listPasskeysForUser, publicPasskey } from "@/lib/passkeys";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error && error.message ? error.message : "Passkey could not be removed.";
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in before changing passkeys." }, { status: 401 });

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("passkey-delete", user.id, guard.headers.get("x-forwarded-for")), 12, 10 * 60_000);
  if (rateLimit.limited) return NextResponse.json({ error: "Too many passkey changes. Please try again later." }, { status: 429 });

  try {
    const body = await request.json() as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) throw new Error("Choose a passkey to remove.");

    await deletePasskeyForUser(user.id, id);
    const passkeys = await listPasskeysForUser(user.id);
    return NextResponse.json({ passkeys: passkeys.map(publicPasskey) });
  } catch (error) {
    return jsonError(error);
  }
}
