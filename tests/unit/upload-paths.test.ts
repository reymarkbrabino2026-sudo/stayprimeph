import { describe, expect, test } from "vitest";
import { cloudinaryListingUploadFolder, extensionFromRequestedPath, listingUploadScopePrefix, serverGeneratedListingUploadPath } from "@/lib/upload-paths";

describe("listing upload paths", () => {
  test("builds host-scoped upload paths with server generated IDs", () => {
    const pathname = serverGeneratedListingUploadPath({
      userId: "host/../evil@example.com",
      listingId: "draft-../listing@example.com",
      requestedPathname: "../../admin/secrets.jpeg",
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
    expect(() => extensionFromRequestedPath("photo.svg")).toThrow("Invalid upload path.");
    expect(() => extensionFromRequestedPath("photo")).toThrow("Invalid upload path.");
  });

  test("uses the same sanitized listing scope prefix for route token checks", () => {
    expect(listingUploadScopePrefix("host/../evil@example.com", "draft-../listing@example.com")).toBe("uploads/listings/hostevilexamplecom/draft-listingexamplecom/");
  });

  test("maps the same user/listing scope into Cloudinary folders", () => {
    expect(cloudinaryListingUploadFolder("host-1", "draft-2")).toBe("stayprimeph/uploads/listings/host-1/draft-2");
  });
});
