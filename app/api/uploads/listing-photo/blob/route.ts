import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import path from "node:path";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig } from "@/lib/photo-storage";
import { checkDistributedRateLimit } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const acceptedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxClientUploadBytes = 10 * 1024 * 1024;
const listingUploadPathPattern = /^uploads\/listings\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function isAllowedListingUploadPath(pathname: string) {
  return listingUploadPathPattern.test(pathname) && !pathname.includes("..") && acceptedExtensions.has(path.extname(pathname).toLowerCase());
}

export async function POST(request: Request) {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });
  }

  if (!hasVercelBlobConfig()) {
    return NextResponse.json({ error: "Vercel Blob is not configured for photo uploads." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    if (body.type === "blob.generate-client-token") {
      let user;
      try {
        user = await requireRole("host", {
          message: "Please sign in with a host account before uploading photos.",
          forbiddenMessage: "Please sign in with a host account before uploading photos.",
        });
      } catch {
        return NextResponse.json({ error: "Please sign in with a host account before uploading photos." }, { status: 401 });
      }
      try {
        requireVerifiedEmail(user);
      } catch {
        return NextResponse.json({ error: "Verify your email address before uploading listing photos." }, { status: 403 });
      }

      const rateLimit = await checkDistributedRateLimit(`listing-blob-upload:${user.id}:${headerStore.get("x-forwarded-for") ?? "local"}`, 30);
      if (rateLimit.limited) {
        logger.warn("listing_blob_upload_rate_limited", { userId: user.id });
        return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
      }
    }

    const result = await handleUpload({
      body,
      request,
      token: getPhotoBlobReadWriteToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedListingUploadPath(pathname)) {
          throw new Error("Invalid upload path.");
        }

        return {
          allowedContentTypes: acceptedTypes,
          maximumSizeInBytes: maxClientUploadBytes,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("vercel_blob_client_upload_setup_failed", { error });
    return NextResponse.json({ error: "Vercel Blob upload setup failed. Check the connected Blob store and try again." }, { status: 502 });
  }
}
