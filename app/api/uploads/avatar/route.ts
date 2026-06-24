import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireStateChangingApiRequest } from "@/lib/api-request-guard";
import { getCurrentUser } from "@/lib/auth";
import { hasCloudinaryConfig } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { moderateListingPhotoImage, sanitizeListingPhotoImage, scanListingPhotoForMalware, validateListingPhotoBytes, validateListingPhotoMetadata } from "@/lib/listing-photo-upload-validation";
import { logger } from "@/lib/logger";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig } from "@/lib/photo-storage";
import { checkDistributedRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { cloudinaryAvatarUploadFolder, serverGeneratedAvatarBlobPath } from "@/lib/upload-paths";
import { v2 as cloudinary } from "cloudinary";

export async function POST(request: Request) {
  const guard = await requireStateChangingApiRequest(request);
  if (!guard.ok) return guard.response;
  const headerStore = guard.headers;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in before uploading a profile photo." }, { status: 401 });
  }

  const rateLimit = await checkDistributedRateLimit(rateLimitKey("avatar-upload", user.id, headerStore.get("x-forwarded-for")), 15);
  if (rateLimit.limited) {
    return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a valid multipart form." }, { status: 400 });
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

  const malwareScan = scanListingPhotoForMalware(bytes);
  if (!malwareScan.ok) {
    logger.warn("avatar_upload_malware_scan_failed", { userId: user.id, reason: malwareScan.reason });
    return NextResponse.json({ error: malwareScan.error }, { status: malwareScan.status });
  }

  const sanitizedImage = await sanitizeListingPhotoImage(bytes, file.type);
  if (!sanitizedImage.ok) {
    return NextResponse.json({ error: sanitizedImage.error }, { status: sanitizedImage.status });
  }

  const moderation = await moderateListingPhotoImage(sanitizedImage);
  if (!moderation.ok) {
    logger.warn("avatar_upload_moderation_failed", { userId: user.id, reason: moderation.reason });
    return NextResponse.json({ error: moderation.error }, { status: moderation.status });
  }

  const variant = sanitizedImage.variants.find((entry) => entry.format === sanitizedImage.primary.format) ?? sanitizedImage.variants[0];
  const uploadBasePath = serverGeneratedAvatarBlobPath(user.id);

  if (hasCloudinaryConfig()) {
    try {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: cloudinaryAvatarUploadFolder(user.id),
            public_id: `${path.basename(uploadBasePath)}-${variant.format}`,
            overwrite: false,
            format: variant.format,
            resource_type: "image",
          },
          (error, uploaded) => {
            if (error || !uploaded) reject(error ?? new Error("Upload failed."));
            else resolve({ secure_url: uploaded.secure_url });
          },
        );
        stream.end(variant.bytes);
      });
      return NextResponse.json({ url: result.secure_url, storage: "cloudinary" });
    } catch (error) {
      logger.error("cloudinary_avatar_upload_failed", { userId: user.id, error });
      return NextResponse.json({ error: "Avatar upload failed. Please try again." }, { status: 502 });
    }
  }

  if (hasVercelBlobConfig()) {
    try {
      const blob = await put(`${uploadBasePath}${variant.extension}`, variant.bytes, {
        access: "public",
        contentType: variant.contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        token: getPhotoBlobReadWriteToken(),
      });
      return NextResponse.json({ url: blob.url, storage: "vercel-blob" });
    } catch (error) {
      logger.error("vercel_blob_avatar_upload_failed", { userId: user.id, error });
      return NextResponse.json({ error: "Avatar upload failed. Please try again." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Photo storage is not configured." }, { status: 503 });
}
