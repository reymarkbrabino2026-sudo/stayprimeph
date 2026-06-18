import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

export async function GET() {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });
  }

  return NextResponse.json({
    error: "Direct Cloudinary browser uploads are disabled. Use /api/uploads/listing-photo so uploaded bytes are validated and re-encoded before storage.",
  }, { status: 410 });
}
