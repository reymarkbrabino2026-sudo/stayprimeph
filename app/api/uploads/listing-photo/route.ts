import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { hasCloudinaryConfig } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { sanitizeListingPhotoImage, type OptimizedListingPhotoVariant, validateListingPhotoBytes, validateListingPhotoMetadata } from "@/lib/listing-photo-upload-validation";
import { logger } from "@/lib/logger";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig } from "@/lib/photo-storage";
import { getPropertyById } from "@/lib/properties";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";
import { cloudinaryListingUploadFolder, normalizeUploadScopeId, serverGeneratedListingBlobPath } from "@/lib/upload-paths";
import { v2 as cloudinary } from "cloudinary";

async function requireListingUploadScope(userId: string, value: FormDataEntryValue | null) {
  const listingId = normalizeUploadScopeId(String(value ?? ""), "");
  if (!listingId) throw new Error("Missing upload scope.");

  if (!listingId.startsWith("draft-")) {
    const property = await getPropertyById(listingId);
    if (!property || property.hostId !== userId) throw new Error("Invalid upload scope.");
  }

  return listingId;
}

export async function POST(request: Request) {
  const headerStore = await headers();
  if (!isTrustedRequestOrigin(headerStore)) {
    return NextResponse.json({ error: untrustedRequestMessage }, { status: 403 });
  }

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

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("listing-upload", user.id, headerStore.get("x-forwarded-for")), 30);
  if (rateLimit.limited) {
    logger.warn("listing_photo_upload_rate_limited", { userId: user.id });
    return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logger.warn("listing_photo_upload_invalid_multipart", { userId: user.id, error });
    return NextResponse.json({ error: "Upload a valid multipart form." }, { status: 400 });
  }
  let listingId: string;
  try {
    listingId = await requireListingUploadScope(user.id, formData.get("listingId"));
  } catch {
    return NextResponse.json({ error: "Upload photos from a valid listing draft or listing." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or AVIF image." }, { status: 400 });
  }

  const metadataValidation = validateListingPhotoMetadata(file);
  if (!metadataValidation.ok) {
    return NextResponse.json({ error: metadataValidation.error }, { status: metadataValidation.status });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const byteValidation = validateListingPhotoBytes(bytes, file.type);
  if (!byteValidation.ok) {
    return NextResponse.json({ error: byteValidation.error }, { status: byteValidation.status });
  }

  const sanitizedImage = await sanitizeListingPhotoImage(bytes, file.type);
  if (!sanitizedImage.ok) {
    return NextResponse.json({ error: sanitizedImage.error }, { status: sanitizedImage.status });
  }

  const uploadBasePath = serverGeneratedListingBlobPath({
    userId: user.id,
    listingId,
  });

  if (hasCloudinaryConfig()) {
    try {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      const folder = cloudinaryListingUploadFolder(user.id, listingId);
      const publicIdBase = path.basename(uploadBasePath);
      const uploadVariant = (variant: OptimizedListingPhotoVariant) => new Promise<{
        format: OptimizedListingPhotoVariant["format"];
        url: string;
        id: string;
        bytes: number;
        width: number;
        height: number;
        contentType: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: `${publicIdBase}-${variant.format}`,
            overwrite: false,
            format: variant.format,
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed."));
            else resolve({
              format: variant.format,
              url: result.secure_url,
              id: result.public_id,
              bytes: result.bytes,
              width: variant.width,
              height: variant.height,
              contentType: variant.contentType,
            });
          },
        );
        stream.end(variant.bytes);
      });
      const uploadedVariants = await Promise.all(sanitizedImage.variants.map(uploadVariant));
      const primary = uploadedVariants.find((variant) => variant.format === sanitizedImage.primary.format) ?? uploadedVariants[0];
      return NextResponse.json({
        id: primary.id,
        url: primary.url,
        bytes: primary.bytes,
        width: primary.width,
        height: primary.height,
        contentType: primary.contentType,
        storage: "cloudinary",
        variants: uploadedVariants,
      });
    } catch (error) {
      logger.error("cloudinary_listing_photo_upload_failed", { userId: user.id, error });
      return NextResponse.json({ error: "Cloudinary upload failed. Check the storage credentials and try again." }, { status: 502 });
    }
  }

  if (hasVercelBlobConfig()) {
    try {
      const token = getPhotoBlobReadWriteToken();
      const uploadedVariants = await Promise.all(sanitizedImage.variants.map(async (variant) => {
        const blob = await put(`${uploadBasePath}${variant.extension}`, variant.bytes, {
          access: "public",
          contentType: variant.contentType,
          addRandomSuffix: false,
          allowOverwrite: false,
          token,
        });
        return {
          format: variant.format,
          url: blob.url,
          id: blob.pathname,
          bytes: variant.bytes.length,
          width: variant.width,
          height: variant.height,
          contentType: variant.contentType,
        };
      }));
      const primary = uploadedVariants.find((variant) => variant.format === sanitizedImage.primary.format) ?? uploadedVariants[0];

      return NextResponse.json({
        id: primary.id,
        url: primary.url,
        bytes: primary.bytes,
        width: primary.width,
        height: primary.height,
        contentType: primary.contentType,
        storage: "vercel-blob",
        variants: uploadedVariants,
      });
    } catch (error) {
      logger.error("vercel_blob_listing_photo_upload_failed", { userId: user.id, error });
      return NextResponse.json({ error: "Vercel Blob upload failed. Check the connected Blob store and try again." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Photo storage is not configured. Add Cloudinary or Vercel Blob environment variables before uploading photos." }, { status: 503 });
}
