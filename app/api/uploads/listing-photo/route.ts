import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireRole, requireVerifiedEmail } from "@/lib/auth";
import { hasCloudinaryConfig } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig, requiresConfiguredPhotoStorage } from "@/lib/photo-storage";
import { checkDistributedRateLimit } from "@/lib/rate-limit";
import { isTrustedRequestOrigin, untrustedRequestMessage } from "@/lib/request-safety";
import { v2 as cloudinary } from "cloudinary";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const acceptedExtensionsByType = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])],
]);
const maxUploadBytes = 4 * 1024 * 1024;

function hasAcceptedFileExtension(fileName: string, type: string) {
  const extension = path.extname(fileName).toLowerCase().replace(".", "");
  return Boolean(extension && acceptedExtensionsByType.get(type)?.has(extension));
}

function hasExpectedImageSignature(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return bytes.length >= pngSignature.length && bytes.subarray(0, pngSignature.length).equals(pngSignature);
  }
  if (type === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
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

  const rateLimit = await checkDistributedRateLimit(`listing-upload:${user.id}:${headerStore.get("x-forwarded-for") ?? "local"}`, 30);
  if (rateLimit.limited) {
    logger.warn("listing_photo_upload_rate_limited", { userId: user.id });
    return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !acceptedTypes.has(file.type) || !hasAcceptedFileExtension(file.name, file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "Upload an image smaller than 4 MB, or use Vercel Blob direct upload." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, file.type)) {
    return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 });
  }

  if (hasCloudinaryConfig()) {
    try {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      const uploaded = await new Promise<{ secure_url: string; public_id: string; bytes: number }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "stayprimeph/listings", resource_type: "image" },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed."));
            else resolve({ secure_url: result.secure_url, public_id: result.public_id, bytes: result.bytes });
          },
        );
        stream.end(bytes);
      });
      return NextResponse.json({ id: uploaded.public_id, url: uploaded.secure_url, bytes: uploaded.bytes });
    } catch (error) {
      console.error("Cloudinary listing photo upload failed", error);
      return NextResponse.json({ error: "Cloudinary upload failed. Check the storage credentials and try again." }, { status: 502 });
    }
  }

  if (hasVercelBlobConfig()) {
    try {
      const token = getPhotoBlobReadWriteToken();
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `${crypto.randomUUID()}.${extension}`;
      const blob = await put(`uploads/listings/${fileName}`, bytes, {
        access: "public",
        contentType: file.type,
        token,
      });

      return NextResponse.json({
        id: blob.pathname,
        url: blob.url,
        bytes: bytes.length,
        storage: "vercel-blob",
      });
    } catch (error) {
      console.error("Vercel Blob listing photo upload failed", error);
      return NextResponse.json({ error: "Vercel Blob upload failed. Check the connected Blob store and try again." }, { status: 502 });
    }
  }

  if (requiresConfiguredPhotoStorage()) {
    return NextResponse.json({ error: "Photo storage is not configured. Add Cloudinary or Vercel Blob environment variables in Vercel." }, { status: 503 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "listings");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), bytes);
  return NextResponse.json({
    id: fileName,
    url: `/uploads/listings/${fileName}`,
    bytes: bytes.length,
    storage: "local-dev",
  });
}
