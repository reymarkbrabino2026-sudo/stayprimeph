import { afterEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  del: vi.fn(),
}));

const cloudinaryMock = vi.hoisted(() => ({
  v2: {
    config: vi.fn(),
    uploader: {
      destroy: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => blob);
vi.mock("cloudinary", () => cloudinaryMock);

import { cleanupStoredPhotoUrl, hasVercelBlobConfig, requiresConfiguredPhotoStorage, storageCleanupTargetFromPhotoUrl } from "@/lib/photo-storage";

describe("requiresConfiguredPhotoStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires configured storage for local builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL", "");

    expect(requiresConfiguredPhotoStorage()).toBe(true);
  });

  it("requires configured storage for hosted production URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stayprimeph.example");
    vi.stubEnv("VERCEL", "");

    expect(requiresConfiguredPhotoStorage()).toBe(true);
  });

  it("requires configured storage on Vercel", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL", "1");

    expect(requiresConfiguredPhotoStorage()).toBe(true);
  });

  it("accepts Vercel Blob as configured hosted storage", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stayprimeph.example");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test_token");

    expect(hasVercelBlobConfig()).toBe(true);
    expect(requiresConfiguredPhotoStorage()).toBe(false);
  });

  it("maps known photo URLs to storage cleanup targets", () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "stayprime-cloud");

    const blobUrl = "https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.webp";
    const cloudinaryUrl = "https://res.cloudinary.com/stayprime-cloud/image/upload/v123/stayprimeph/uploads/listings/host-1/draft-1/photo.webp";

    expect(storageCleanupTargetFromPhotoUrl(blobUrl)).toEqual({ storage: "vercel-blob", id: blobUrl });
    expect(storageCleanupTargetFromPhotoUrl(cloudinaryUrl)).toEqual({
      storage: "cloudinary",
      id: "stayprimeph/uploads/listings/host-1/draft-1/photo",
    });
    expect(storageCleanupTargetFromPhotoUrl("/uploads/payment-receipts/guest-1/booking-1/receipt.webp")).toEqual({
      storage: "local",
      id: "/uploads/payment-receipts/guest-1/booking-1/receipt.webp",
    });
    expect(storageCleanupTargetFromPhotoUrl("https://assets.example/photo.webp")).toBeNull();
  });

  it("deletes Vercel Blob uploads with the server-side photo token", async () => {
    vi.stubEnv("PHOTO_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_photo_test_token");
    blob.del.mockResolvedValueOnce(undefined);

    const blobUrl = "https://store.public.blob.vercel-storage.com/uploads/listings/host-1/draft-1/photo.webp";
    await expect(cleanupStoredPhotoUrl(blobUrl)).resolves.toMatchObject({ attempted: true, failures: [] });

    expect(blob.del).toHaveBeenCalledWith(blobUrl, { token: "vercel_blob_rw_photo_test_token" });
  });

  it("deletes Cloudinary uploads by parsed public id", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "stayprime-cloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "cloudinary-key");
    vi.stubEnv("CLOUDINARY_API_SECRET", "cloudinary-secret");
    cloudinaryMock.v2.uploader.destroy.mockResolvedValueOnce({ result: "ok" });

    const cloudinaryUrl = "https://res.cloudinary.com/stayprime-cloud/image/upload/v123/stayprimeph/uploads/avatars/user-1/photo.webp";
    await expect(cleanupStoredPhotoUrl(cloudinaryUrl)).resolves.toMatchObject({ attempted: true, failures: [] });

    expect(cloudinaryMock.v2.config).toHaveBeenCalledWith({
      cloud_name: "stayprime-cloud",
      api_key: "cloudinary-key",
      api_secret: "cloudinary-secret",
      secure: true,
    });
    expect(cloudinaryMock.v2.uploader.destroy).toHaveBeenCalledWith("stayprimeph/uploads/avatars/user-1/photo", {
      resource_type: "image",
      invalidate: true,
    });
  });
});
