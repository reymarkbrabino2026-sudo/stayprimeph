import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { v2 as cloudinary } from "cloudinary";
import { hasCloudinaryConfig } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { sanitizeListingPhotoImage, validateListingPhotoBytes, validateListingPhotoMetadata } from "@/lib/listing-photo-upload-validation";
import { getPhotoBlobReadWriteToken, hasVercelBlobConfig } from "@/lib/photo-storage";
import {
  cloudinaryPaymentReceiptUploadFolder,
  serverGeneratedPaymentReceiptBlobPath,
} from "@/lib/upload-paths";

type StoredReceiptVariant = {
  bytes: Buffer;
  contentType: string;
  extension: string;
  format: string;
};

function assertReceiptFile(file: FormDataEntryValue | null): File {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Upload a receipt screenshot before submitting payment.");
  }
  return file;
}

async function getSanitizedReceiptVariant(file: File): Promise<StoredReceiptVariant> {
  const metadataValidation = validateListingPhotoMetadata(file);
  if (!metadataValidation.ok) throw new Error(metadataValidation.error);

  const originalBytes = Buffer.from(await file.arrayBuffer());
  const byteValidation = validateListingPhotoBytes(originalBytes, file.type);
  if (!byteValidation.ok) throw new Error(byteValidation.error);

  const sanitizedImage = await sanitizeListingPhotoImage(originalBytes, file.type);
  if (!sanitizedImage.ok) throw new Error(sanitizedImage.error);

  return sanitizedImage.variants.find((variant) => variant.format === sanitizedImage.primary.format) ?? sanitizedImage.variants[0];
}

async function uploadReceiptToCloudinary(input: {
  uploadBasePath: string;
  userId: string;
  bookingId: string;
  variant: StoredReceiptVariant;
}) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: cloudinaryPaymentReceiptUploadFolder(input.userId, input.bookingId),
        public_id: `${path.basename(input.uploadBasePath)}-${input.variant.format}`,
        overwrite: false,
        format: input.variant.format,
        resource_type: "image",
      },
      (error, uploaded) => {
        if (error || !uploaded) reject(error ?? new Error("Receipt upload failed."));
        else resolve({ secure_url: uploaded.secure_url });
      },
    );
    stream.end(input.variant.bytes);
  });

  return result.secure_url;
}

async function uploadReceiptToVercelBlob(input: { uploadBasePath: string; variant: StoredReceiptVariant }) {
  const blob = await put(`${input.uploadBasePath}${input.variant.extension}`, input.variant.bytes, {
    access: "public",
    contentType: input.variant.contentType,
    addRandomSuffix: false,
    allowOverwrite: false,
    token: getPhotoBlobReadWriteToken(),
  });
  return blob.url;
}

async function storeReceiptLocally(input: { uploadBasePath: string; variant: StoredReceiptVariant }) {
  const publicPath = `${input.uploadBasePath}${input.variant.extension}`;
  const absolutePath = path.join(process.cwd(), "public", ...publicPath.split("/"));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.variant.bytes);
  return `/${publicPath}`;
}

export async function storePaymentReceiptImage(input: {
  file: FormDataEntryValue | null;
  userId: string;
  bookingId: string;
}) {
  const file = assertReceiptFile(input.file);
  const variant = await getSanitizedReceiptVariant(file);
  const uploadBasePath = serverGeneratedPaymentReceiptBlobPath({
    userId: input.userId,
    bookingId: input.bookingId,
  });

  if (hasCloudinaryConfig()) {
    return uploadReceiptToCloudinary({ ...input, uploadBasePath, variant });
  }

  if (hasVercelBlobConfig()) {
    return uploadReceiptToVercelBlob({ uploadBasePath, variant });
  }

  return storeReceiptLocally({ uploadBasePath, variant });
}
