import { describe, expect, test } from "vitest";
import { extensionFromRequestedPath, listingUploadHostPrefix, serverGeneratedListingUploadPath } from "@/lib/upload-paths";

describe("listing upload paths", () => {
  test("builds host-scoped upload paths with server generated IDs", () => {
    const pathname = serverGeneratedListingUploadPath({
      hostId: "host/../evil@example.com",
      requestedPathname: "../../admin/secrets.jpeg",
      uploadId: "upload-123",
    });

    expect(pathname).toBe("uploads/listings/hostevilexamplecom/upload-123.jpg");
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

  test("uses the same sanitized host prefix for route token checks", () => {
    expect(listingUploadHostPrefix("host/../evil@example.com")).toBe("uploads/listings/hostevilexamplecom/");
  });
});
