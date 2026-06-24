import { NextResponse } from "next/server";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    error: "Direct browser-to-Blob uploads are disabled. Use /api/uploads/listing-photo so file type, extension, size, and magic-byte checks run before storage.",
  }, { status: 410 });
}
