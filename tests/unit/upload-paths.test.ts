import { describe, expect, test } from "vitest";
import {
  cloudinaryListingUploadFolder,
  extensionFromContentType,
  extensionFromRequestedPath,
  isHostScopedListingPhotoUrl,
  isIntendedListingPhotoUrl,
  listingUploadScopePrefix,
  serverGeneratedListingBlobPath,
  serverGeneratedListingUploadPath,
} from "@/lib/upload-paths";

describe("listing upload paths", () => {
  test("builds host-scoped upload paths with server generated IDs", () => {
    const pathname = serverGeneratedListingUploadPath({
      userId: "host/../evil@example.com",
      listingId: "draft-../listing@example.com",
      extension: ".jpeg",
      uploadId: "upload-123",
    });

    expect(pathname).toBe("uploads/listings/hostevilexamplecom/draft-listingexamplecom/upload-123.jpg");
    expect(pathname).not.toContain("admin");
    expect(pathname).not.toContain("..");
    expect(pathname).not.toContain("@");
  });

  test("accepts only listing image extensions", () => {
    expect(extensionFromRequestedPath("photo.JPG")).toBe(".jpg");
    expect(extensionFromRequestedPath("photo.png")).toBe(".png");
    expect(extensionFromRequestedPath("photo.webp")).toBe(".webp");
    expect(extensionFromRequestedPath("photo.avif")).toBe(".avif");
    expect(() => extensionFromRequestedPath("photo.svg")).toThrow("Invalid upload path.");
    expect(() => extensionFromRequestedPath("photo")).toThrow("Invalid upload path.");
  });

  test("derives persisted extensions from validated content types", () => {
    expect(extensionFromContentType("image/jpeg")).toBe(".jpg");
    expect(extensionFromContentType("image/png")).toBe(".png");
    expect(extensionFromContentType("image/webp")).toBe(".webp");
    expect(extensionFromContentType("image/avif")).toBe(".avif");
    expect(() => extensionFromContentType("image/svg+xml")).toThrow("Invalid upload content type.");
  });

  test("generates direct blob paths without using client requested names", () => {
    const pathname = serverGeneratedListingBlobPath({
      userId: "host-1",
      listingId: "draft-2",
      uploadId: "server-generated",
    });

    expect(pathname).toBe("uploads/listings/host-1/draft-2/server-generated");
    expect(pathname).not.toContain("client");
    expect(pathname).not.toContain(".jpg");
  });

  test("uses the same sanitized listing scope prefix for route token checks", () => {
    expect(listingUploadScopePrefix("host/../evil@example.com", "draft-../listing@example.com")).toBe("uploads/listings/hostevilexamplecom/draft-listingexamplecom/");
  });

  test("maps the same user/listing scope into Cloudinary folders", () => {
    expect(cloudinaryListingUploadFolder("host-1", "draft-2")).toBe("stayprimeph/uploads/listings/host-1/draft-2");
  });

  test("accepts only images from the intended host and listing upload scope", () => {
    const scope = { userId: "host-1", listingId: "draft-1", cloudName: "stayprime-cloud" };

    expect(isIntendedListingPhotoUrl("/uploads/listings/host-1/draft-1/photo.jpg", scope)).toBe(true);
    expect(isIntendedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.webp", scope)).toBe(true);
    expect(isIntendedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.avif", scope)).toBe(true);
    expect(isIntendedListingPhotoUrl("https://res.cloudinary.com/stayprime-cloud/image/upload/v123/stayprimeph/uploads/listings/host-1/draft-1/photo.png", scope)).toBe(true);

    expect(isIntendedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-2/draft-1/photo.webp", scope)).toBe(false);
    expect(isIntendedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-2/photo.webp", scope)).toBe(false);
    expect(isIntendedListingPhotoUrl("https://res.cloudinary.com/other-cloud/image/upload/v123/stayprimeph/uploads/listings/host-1/draft-1/photo.png", scope)).toBe(false);
    expect(isIntendedListingPhotoUrl("https://example.com/uploads/listings/host-1/draft-1/photo.jpg", scope)).toBe(false);
  });

  test("approval accepts only host-scoped listing images", () => {
    expect(isHostScopedListingPhotoUrl("/uploads/listings/host-1/draft-1/photo.jpg", { userId: "host-1" })).toBe(true);
    expect(isHostScopedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-1/listing-1/photo.jpg", { userId: "host-1" })).toBe(true);

    expect(isHostScopedListingPhotoUrl("/uploads/listings/host-2/draft-1/photo.jpg", { userId: "host-1" })).toBe(false);
    expect(isHostScopedListingPhotoUrl("pending-upload", { userId: "host-1" })).toBe(false);
    expect(isHostScopedListingPhotoUrl("https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.svg", { userId: "host-1" })).toBe(false);
  });
});
