import { afterEach, describe, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function loadEnv(nodeEnv: NodeJS.ProcessEnv["NODE_ENV"], persistenceDriver?: string, blobReadWriteToken?: string) {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    NODE_ENV: nodeEnv,
    DATABASE_URL: "postgresql://user:password@localhost:5432/stayprimeph",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    AUTH_SECRET: "test-secret-with-at-least-32-characters",
    BLOB_READ_WRITE_TOKEN: blobReadWriteToken,
    PERSISTENCE_DRIVER: persistenceDriver,
  };

  const envModule = await import("@/lib/env");
  return envModule.env;
}

describe("environment defaults", () => {
  test("defaults to JSON persistence outside production", async () => {
    const env = await loadEnv("development");

    expect(env.PERSISTENCE_DRIVER).toBe("json");
  });

  test("defaults to Prisma persistence in production", async () => {
    const env = await loadEnv("production");

    expect(env.PERSISTENCE_DRIVER).toBe("prisma");
  });

  test("uses JSON persistence in production when Vercel Blob is configured", async () => {
    const env = await loadEnv("production", undefined, "vercel_blob_rw_store_test_token");

    expect(env.PERSISTENCE_DRIVER).toBe("json");
  });
});
