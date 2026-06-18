import { afterEach, describe, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function loadEnv({
  blobReadWriteToken,
  buildPhase,
  databaseUrl = "postgresql://user:password@localhost:5432/stayprimeph",
  directUrl = "postgresql://user:password@localhost:5432/stayprimeph",
  nodeEnv,
  persistenceDriver,
  paymentLaunchMode,
  stripeSecretKey,
  stripeWebhookSecret,
  stripePublishableKey,
}: {
  blobReadWriteToken?: string;
  buildPhase?: string;
  databaseUrl?: string;
  directUrl?: string;
  nodeEnv: NodeJS.ProcessEnv["NODE_ENV"];
  persistenceDriver?: string;
  paymentLaunchMode?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePublishableKey?: string;
}) {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    NEXT_PUBLIC_APP_URL: "https://example.com",
    AUTH_SECRET: "test-secret-with-at-least-32-characters",
    BLOB_READ_WRITE_TOKEN: blobReadWriteToken,
    PERSISTENCE_DRIVER: persistenceDriver,
    PAYMENT_LAUNCH_MODE: paymentLaunchMode,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
    STAYPRIMEPH_BUILD_PHASE: buildPhase,
  };

  const envModule = await import("@/lib/env");
  return envModule.env;
}

describe("environment defaults", () => {
  test("defaults to JSON persistence outside production", async () => {
    const env = await loadEnv({ nodeEnv: "development" });

    expect(env.PERSISTENCE_DRIVER).toBe("json");
  });

  test("defaults to Prisma persistence in production", async () => {
    const env = await loadEnv({ nodeEnv: "production" });

    expect(env.PERSISTENCE_DRIVER).toBe("prisma");
  });

  test("rejects JSON persistence in production runtime", async () => {
    await expect(loadEnv({ nodeEnv: "production", persistenceDriver: "json" })).rejects.toThrow("PERSISTENCE_DRIVER must be prisma in production runtime.");
  });

  test("rejects missing PostgreSQL runtime database URLs in production", async () => {
    await expect(loadEnv({ nodeEnv: "production", databaseUrl: "", directUrl: "" })).rejects.toThrow("DATABASE_URL must be a PostgreSQL connection string in production runtime.");
    await expect(loadEnv({ nodeEnv: "production", directUrl: "" })).rejects.toThrow("DIRECT_URL must be a PostgreSQL connection string in production runtime.");
  });

  test("allows JSON persistence during sanitized production builds", async () => {
    const env = await loadEnv({
      blobReadWriteToken: "vercel_blob_rw_store_test_token",
      buildPhase: "1",
      databaseUrl: "",
      directUrl: "",
      nodeEnv: "production",
      persistenceDriver: "json",
    });

    expect(env.PERSISTENCE_DRIVER).toBe("json");
  });

  test("defaults paid bookings to disabled", async () => {
    const env = await loadEnv({ nodeEnv: "production" });

    expect(env.PAYMENT_LAUNCH_MODE).toBe("disabled");
  });

  test("requires live Stripe configuration before enabling production provider payments", async () => {
    await expect(loadEnv({ nodeEnv: "production", paymentLaunchMode: "stripe" })).rejects.toThrow("STRIPE_SECRET_KEY must be a live Stripe key");
    await expect(loadEnv({
      nodeEnv: "production",
      paymentLaunchMode: "stripe",
      stripeSecretKey: "sk_live_test",
      stripeWebhookSecret: "whsec_test",
      stripePublishableKey: "pk_live_test",
    })).resolves.toMatchObject({ PAYMENT_LAUNCH_MODE: "stripe" });
  });
});
