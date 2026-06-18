import { randomUUID } from "node:crypto";
import path from "node:path";

const acceptedListingPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const listingPhotoExtensionByContentType = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function extensionFromRequestedPath(pathname: string) {
  const extension = path.extname(pathname).toLowerCase();
  if (!acceptedListingPhotoExtensions.has(extension)) throw new Error("Invalid upload path.");
  return extension === ".jpeg" ? ".jpg" : extension;
}

export function extensionFromContentType(contentType: string) {
  const extension = listingPhotoExtensionByContentType.get(contentType.toLowerCase());
  if (!extension) throw new Error("Invalid upload content type.");
  return extension;
}

export function normalizeUploadScopeId(value: string, fallback = "draft") {
  return safePathSegment(value) || fallback;
}

function normalizedUploadExtension(extension: string) {
  const normalized = extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  if (!acceptedListingPhotoExtensions.has(normalized)) throw new Error("Invalid upload path.");
  return normalized === ".jpeg" ? ".jpg" : normalized;
}

export function serverGeneratedListingUploadPath(input: { userId: string; listingId: string; extension: string; uploadId?: string }) {
  const extension = normalizedUploadExtension(input.extension);
  const uploadId = input.uploadId ?? randomUUID();
  return `${listingUploadScopePrefix(input.userId, input.listingId)}${uploadId}${extension}`;
}

export function serverGeneratedListingBlobPath(input: { userId: string; listingId: string; uploadId?: string }) {
  const uploadId = input.uploadId ?? randomUUID();
  return `${listingUploadScopePrefix(input.userId, input.listingId)}${uploadId}`;
}

export function listingUploadScopePrefix(userId: string, listingId: string) {
  return `uploads/listings/${normalizeUploadScopeId(userId, "user")}/${normalizeUploadScopeId(listingId)}/`;
}

export function cloudinaryListingUploadFolder(userId: string, listingId: string) {
  return `stayprimeph/${listingUploadScopePrefix(userId, listingId).replace(/\/$/, "")}`;
}
