import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { assertValidCsrfToken, invalidCsrfMessage } from "@/lib/csrf";
import { csrfHeaderName } from "@/lib/csrf-fields";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

type ApiGuardResult =
  | { ok: true; headers: Headers }
  | { ok: false; response: NextResponse };

export async function requireStateChangingApiRequest(request: Request): Promise<ApiGuardResult> {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return {
      ok: false,
      response: NextResponse.json({ error: untrustedRequestMessage }, { status: 403 }),
    };
  }

  try {
    await assertValidCsrfToken(request.headers.get(csrfHeaderName));
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: invalidCsrfMessage }, { status: 403 }),
    };
  }

  return { ok: true, headers: headerStore };
}
