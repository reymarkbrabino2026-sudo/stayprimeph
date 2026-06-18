import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

export async function POST() {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });
  }

  return NextResponse.json({
    error: "Direct browser-to-Blob uploads are disabled. Use /api/uploads/listing-photo so file type, extension, size, and magic-byte checks run before storage.",
  }, { status: 410 });
}
