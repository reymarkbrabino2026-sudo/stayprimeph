import { randomUUID } from "node:crypto";
import path from "node:path";

const acceptedListingPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const listingPhotoExtensionByContentType = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
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

function hasAcceptedListingPhotoExtension(pathname: string) {
  try {
    extensionFromRequestedPath(pathname);
    return true;
  } catch {
    return false;
  }
}

function cloudinaryListingPathMatches(pathname: string, expectedPrefix: string, cloudName?: string) {
  if (!cloudName) return false;
  const uploadPrefix = `/${cloudName}/image/upload/`;
  if (!pathname.startsWith(uploadPrefix)) return false;

  const expectedPublicIdPrefix = `stayprimeph/${expectedPrefix}`;
  const uploadPath = pathname.slice(uploadPrefix.length);
  return uploadPath.split("/").some((_, index, parts) =>
    parts.slice(index).join("/").startsWith(expectedPublicIdPrefix),
  );
}

function listingPhotoUrlMatchesPrefix(value: string, expectedPrefix: string, cloudName?: string) {
  if (value.startsWith("/")) {
    return value.startsWith(`/${expectedPrefix}`) && hasAcceptedListingPhotoExtension(value);
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!hasAcceptedListingPhotoExtension(url.pathname)) return false;

    if (url.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return url.pathname.startsWith(`/${expectedPrefix}`);
    }

    if (url.hostname === "res.cloudinary.com") {
      return cloudinaryListingPathMatches(url.pathname, expectedPrefix, cloudName);
    }

    return false;
  } catch {
    return false;
  }
}

export function isIntendedListingPhotoUrl(value: string, input: { userId: string; listingId: string; cloudName?: string }) {
  return listingPhotoUrlMatchesPrefix(value, listingUploadScopePrefix(input.userId, input.listingId), input.cloudName);
}

export function isHostScopedListingPhotoUrl(value: string, input: { userId: string; cloudName?: string }) {
  return listingPhotoUrlMatchesPrefix(value, `uploads/listings/${normalizeUploadScopeId(input.userId, "user")}/`, input.cloudName);
}

export function avatarUploadScopePrefix(userId: string) {
  return `uploads/avatars/${normalizeUploadScopeId(userId, "user")}/`;
}

export function serverGeneratedAvatarBlobPath(userId: string, uploadId?: string) {
  return `${avatarUploadScopePrefix(userId)}${uploadId ?? randomUUID()}`;
}

export function cloudinaryAvatarUploadFolder(userId: string) {
  return `stayprimeph/${avatarUploadScopePrefix(userId).replace(/\/$/, "")}`;
}

export function isIntendedAvatarUrl(value: string, input: { userId: string; cloudName?: string }) {
  return listingPhotoUrlMatchesPrefix(value, avatarUploadScopePrefix(input.userId), input.cloudName);
}

export function paymentReceiptUploadScopePrefix(userId: string, bookingId: string) {
  return `uploads/payment-receipts/${normalizeUploadScopeId(userId, "user")}/${normalizeUploadScopeId(bookingId, "booking")}/`;
}

export function serverGeneratedPaymentReceiptBlobPath(input: { userId: string; bookingId: string; uploadId?: string }) {
  return `${paymentReceiptUploadScopePrefix(input.userId, input.bookingId)}${input.uploadId ?? randomUUID()}`;
}

export function cloudinaryPaymentReceiptUploadFolder(userId: string, bookingId: string) {
  return `stayprimeph/${paymentReceiptUploadScopePrefix(userId, bookingId).replace(/\/$/, "")}`;
}

export function isIntendedPaymentReceiptUrl(value: string, input: { userId: string; bookingId: string; cloudName?: string }) {
  return listingPhotoUrlMatchesPrefix(value, paymentReceiptUploadScopePrefix(input.userId, input.bookingId), input.cloudName);
}
