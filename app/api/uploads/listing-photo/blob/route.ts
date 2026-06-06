import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import path from "node:path";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig } from "@/lib/photo-storage";
import { checkDistributedRateLimit } from "@/lib/rate-limit";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const acceptedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxClientUploadBytes = 10 * 1024 * 1024;
const listingUploadPathPattern = /^uploads\/listings\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function isAllowedListingUploadPath(pathname: string) {
  return listingUploadPathPattern.test(pathname) && !pathname.includes("..") && acceptedExtensions.has(path.extname(pathname).toLowerCase());
}

export async function POST(request: Request) {
  if (!hasVercelBlobConfig()) {
    return NextResponse.json({ error: "Vercel Blob is not configured for photo uploads." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    if (body.type === "blob.generate-client-token") {
      const user = await getCurrentUser();
      if (!user || user.role !== "host") {
        return NextResponse.json({ error: "Please sign in with a host account before uploading photos." }, { status: 401 });
      }

      const headerStore = await headers();
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
    console.error("Vercel Blob client upload setup failed", error);
    return NextResponse.json({ error: "Vercel Blob upload setup failed. Check the connected Blob store and try again." }, { status: 502 });
  }
}
