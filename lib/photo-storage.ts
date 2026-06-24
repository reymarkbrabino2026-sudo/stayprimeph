import fs from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";
import { v2 as cloudinary } from "cloudinary";

export type PhotoStorageCleanupTarget =
  | { storage: "cloudinary"; id: string }
  | { storage: "vercel-blob"; id: string }
  | { storage: "local"; id: string };

export function requiresConfiguredPhotoStorage() {
  return !hasVercelBlobConfig();
}

export function getPhotoBlobReadWriteToken() {
  return process.env.PHOTO_BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function hasVercelBlobConfig() {
  return Boolean(getPhotoBlobReadWriteToken());
}

function configuredCloudinaryCredentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function configureCloudinaryCleanup() {
  const credentials = configuredCloudinaryCredentials();
  if (!credentials) return false;

  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  });
  return true;
}

function safeLocalUploadPath(value: string) {
  const pathname = value.startsWith("/") ? value.slice(1) : value;
  const normalizedPath = path.normalize(pathname);
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const absolutePath = path.resolve(process.cwd(), "public", normalizedPath);

  if (path.isAbsolute(pathname) || !absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return absolutePath;
}

function cloudinaryPublicIdFromUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "res.cloudinary.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const [cloudName, resourceType, deliveryType, ...uploadParts] = parts;
    if (!cloudName || resourceType !== "image" || deliveryType !== "upload") return null;

    const configuredCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    if (configuredCloudName && configuredCloudName !== cloudName) return null;

    const versionIndex = uploadParts.findIndex((part) => /^v\d+$/.test(part));
    const publicPathParts = uploadParts.slice(versionIndex >= 0 ? versionIndex + 1 : 0);
    if (!publicPathParts.length) return null;

    const idWithExtension = publicPathParts.map((part) => decodeURIComponent(part)).join("/");
    return idWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

export function storageCleanupTargetFromPhotoUrl(value: string): PhotoStorageCleanupTarget | null {
  if (value.startsWith("/uploads/")) return { storage: "local", id: value };

  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return { storage: "vercel-blob", id: value };
    }

    const cloudinaryPublicId = cloudinaryPublicIdFromUrl(value);
    if (cloudinaryPublicId) return { storage: "cloudinary", id: cloudinaryPublicId };
  } catch {
    return null;
  }

  return null;
}

export async function cleanupUploadedPhotos(targets: PhotoStorageCleanupTarget[]) {
  const settled = await Promise.allSettled(targets.map(async (target) => {
    if (target.storage === "cloudinary") {
      if (!configureCloudinaryCleanup()) throw new Error("Cloudinary cleanup is not configured.");
      await cloudinary.uploader.destroy(target.id, { resource_type: "image", invalidate: true });
      return;
    }

    if (target.storage === "vercel-blob") {
      await del(target.id, { token: getPhotoBlobReadWriteToken() });
      return;
    }

    const absolutePath = safeLocalUploadPath(target.id);
    if (!absolutePath) throw new Error("Refusing to clean up a file outside public uploads.");
    await fs.rm(absolutePath, { force: true });
  }));

  return settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ target: targets[index], error: result.reason }]
      : [],
  );
}

export async function cleanupStoredPhotoUrl(value: string) {
  const target = storageCleanupTargetFromPhotoUrl(value);
  if (!target) return { attempted: false as const, failures: [] };

  const failures = await cleanupUploadedPhotos([target]);
  return { attempted: true as const, failures };
}
