import { NextResponse, type NextRequest } from "next/server";
import { enforceDataRetention } from "@/lib/data-retention";
import { env } from "@/lib/env";

function retentionSecret() {
  return env.RETENTION_CRON_SECRET ?? env.CRON_SECRET;
}

function authorized(request: NextRequest) {
  const secret = retentionSecret();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const pruned = await enforceDataRetention();
  return NextResponse.json({ ok: true, pruned });
}
