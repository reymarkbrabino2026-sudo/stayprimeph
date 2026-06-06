import { afterEach, describe, expect, it, vi } from "vitest";
import { hasVercelBlobConfig, requiresConfiguredPhotoStorage } from "@/lib/photo-storage";

describe("requiresConfiguredPhotoStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local fallback for production builds served on localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL", "");

    expect(requiresConfiguredPhotoStorage()).toBe(false);
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
});
