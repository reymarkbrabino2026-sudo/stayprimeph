import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { getCloudinarySignature } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

export async function GET() {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });
  }

  let user;
  try {
    user = await requireRole("host", { message: "Unauthorized", forbiddenMessage: "Unauthorized" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    requireVerifiedEmail(user);
  } catch {
    return NextResponse.json({ error: "Verify your email address before uploading listing photos." }, { status: 403 });
  }

  const rateLimit = await checkDistributedRateLimit(`cloudinary-signature:${user.id}:${headerStore.get("x-forwarded-for") ?? "local"}`, 60);
  if (rateLimit.limited) {
    logger.warn("cloudinary_signature_rate_limited", { userId: user.id });
    return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
  }

  const payload = getCloudinarySignature();
  if (!payload) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  return NextResponse.json(payload);
}
