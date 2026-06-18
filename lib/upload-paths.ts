import { randomUUID } from "node:crypto";
import path from "node:path";

const acceptedListingPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "host";
}

export function extensionFromRequestedPath(pathname: string) {
  const extension = path.extname(pathname).toLowerCase();
  if (!acceptedListingPhotoExtensions.has(extension)) throw new Error("Invalid upload path.");
  return extension === ".jpeg" ? ".jpg" : extension;
}

export function serverGeneratedListingUploadPath(input: { hostId: string; requestedPathname: string; uploadId?: string }) {
  const extension = extensionFromRequestedPath(input.requestedPathname);
  const uploadId = input.uploadId ?? randomUUID();
  return `uploads/listings/${safePathSegment(input.hostId)}/${uploadId}${extension}`;
}

export function listingUploadHostPrefix(hostId: string) {
  return `uploads/listings/${safePathSegment(hostId)}/`;
}
