import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getCloudinarySignature } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "host") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const headerStore = await headers();
  const rateLimit = await checkDistributedRateLimit(`cloudinary-signature:${user.id}:${headerStore.get("x-forwarded-for") ?? "local"}`, 60);
  if (rateLimit.limited) {
    logger.warn("cloudinary_signature_rate_limited", { userId: user.id });
    return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
  }

  const payload = getCloudinarySignature();
  if (!payload) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  return NextResponse.json(payload);
}
