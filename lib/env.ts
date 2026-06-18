import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  POSTGRES_URL_NON_POOLING: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  PERSISTENCE_DRIVER: z.enum(["json", "prisma"]).default("json"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_ANALYTICS: z.enum(["enabled", "disabled"]).default("disabled"),
  PAYMENT_LAUNCH_MODE: z.enum(["disabled", "stripe"]).default("disabled"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  RETENTION_CRON_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return undefined;
  return trimmed;
}

const explicitPersistenceDriver = optionalEnv(process.env.PERSISTENCE_DRIVER);
const isProductionRuntime = process.env.NODE_ENV === "production" && process.env.STAYPRIMEPH_BUILD_PHASE !== "1";
const databaseUrl = optionalEnv(process.env.DATABASE_URL);
const postgresUrlNonPooling = optionalEnv(process.env.POSTGRES_URL_NON_POOLING);
const directUrl = optionalEnv(process.env.DIRECT_URL) ?? postgresUrlNonPooling;
const paymentLaunchMode = optionalEnv(process.env.PAYMENT_LAUNCH_MODE) ?? "disabled";
const stripeSecretKey = optionalEnv(process.env.STRIPE_SECRET_KEY);
const stripeWebhookSecret = optionalEnv(process.env.STRIPE_WEBHOOK_SECRET);
const stripePublishableKey = optionalEnv(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function isPostgresUrl(value: string | undefined) {
  return Boolean(value?.startsWith("postgresql://") || value?.startsWith("postgres://"));
}

if (isProductionRuntime && explicitPersistenceDriver && explicitPersistenceDriver !== "prisma") {
  throw new Error("PERSISTENCE_DRIVER must be prisma in production runtime.");
}

if (isProductionRuntime && !isPostgresUrl(databaseUrl)) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string in production runtime.");
}

if (isProductionRuntime && !isPostgresUrl(directUrl)) {
  throw new Error("DIRECT_URL must be a PostgreSQL connection string in production runtime.");
}

if (isProductionRuntime && (!optionalEnv(process.env.UPSTASH_REDIS_REST_URL) || !optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN))) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for production rate limiting.");
}

if (isProductionRuntime && paymentLaunchMode === "stripe") {
  if (!stripeSecretKey?.startsWith("sk_live_") && !stripeSecretKey?.startsWith("rk_live_")) {
    throw new Error("STRIPE_SECRET_KEY must be a live Stripe key when PAYMENT_LAUNCH_MODE=stripe in production runtime.");
  }

  if (!stripeWebhookSecret?.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set when PAYMENT_LAUNCH_MODE=stripe in production runtime.");
  }

  if (!stripePublishableKey?.startsWith("pk_live_")) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a live Stripe publishable key when PAYMENT_LAUNCH_MODE=stripe in production runtime.");
  }
}

const persistenceDriver = isProductionRuntime
  ? "prisma"
  : explicitPersistenceDriver ?? "json";

export const env = envSchema.parse({
  DATABASE_URL: databaseUrl ?? "postgresql://unused:unused@localhost:5432/unused?schema=public",
  DIRECT_URL: directUrl,
  POSTGRES_URL_NON_POOLING: postgresUrlNonPooling,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  PERSISTENCE_DRIVER: persistenceDriver,
  UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
  SENTRY_DSN: optionalEnv(process.env.SENTRY_DSN),
  NEXT_PUBLIC_SENTRY_DSN: optionalEnv(process.env.NEXT_PUBLIC_SENTRY_DSN),
  NEXT_PUBLIC_VERCEL_ANALYTICS: optionalEnv(process.env.NEXT_PUBLIC_VERCEL_ANALYTICS),
  PAYMENT_LAUNCH_MODE: paymentLaunchMode,
  RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
  EMAIL_FROM: optionalEnv(process.env.EMAIL_FROM),
  STRIPE_SECRET_KEY: stripeSecretKey,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
  RETENTION_CRON_SECRET: optionalEnv(process.env.RETENTION_CRON_SECRET),
  CRON_SECRET: optionalEnv(process.env.CRON_SECRET),
  CLOUDINARY_CLOUD_NAME: optionalEnv(process.env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: optionalEnv(process.env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: optionalEnv(process.env.CLOUDINARY_API_SECRET),
  NEXT_PUBLIC_SUPABASE_URL: optionalEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
});
