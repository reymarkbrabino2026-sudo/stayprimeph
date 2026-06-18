import { randomUUID } from "node:crypto";
import path from "node:path";

const acceptedListingPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function extensionFromRequestedPath(pathname: string) {
  const extension = path.extname(pathname).toLowerCase();
  if (!acceptedListingPhotoExtensions.has(extension)) throw new Error("Invalid upload path.");
  return extension === ".jpeg" ? ".jpg" : extension;
}

export function normalizeUploadScopeId(value: string, fallback = "draft") {
  return safePathSegment(value) || fallback;
}

export function serverGeneratedListingUploadPath(input: { userId: string; listingId: string; requestedPathname: string; uploadId?: string }) {
  const extension = extensionFromRequestedPath(input.requestedPathname);
  const uploadId = input.uploadId ?? randomUUID();
  return `${listingUploadScopePrefix(input.userId, input.listingId)}${uploadId}${extension}`;
}

export function listingUploadScopePrefix(userId: string, listingId: string) {
  return `uploads/listings/${normalizeUploadScopeId(userId, "user")}/${normalizeUploadScopeId(listingId)}/`;
}

export function cloudinaryListingUploadFolder(userId: string, listingId: string) {
  return `stayprimeph/${listingUploadScopePrefix(userId, listingId).replace(/\/$/, "")}`;
}
