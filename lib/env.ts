import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  PERSISTENCE_DRIVER: z.enum(["json", "prisma"]).default("json"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_ANALYTICS: z.enum(["enabled", "disabled"]).default("disabled"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

function optionalEnv(value: string | undefined) {
  return value && value.trim() ? value : undefined;
}

const persistenceDriver =
  optionalEnv(process.env.PERSISTENCE_DRIVER) ??
  (optionalEnv(process.env.BLOB_READ_WRITE_TOKEN) ? "json" : process.env.NODE_ENV === "production" ? "prisma" : "json");

export const env = envSchema.parse({
  DATABASE_URL: optionalEnv(process.env.DATABASE_URL) ?? "postgresql://unused:unused@localhost:5432/unused?schema=public",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  PERSISTENCE_DRIVER: persistenceDriver,
  UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
  SENTRY_DSN: optionalEnv(process.env.SENTRY_DSN),
  NEXT_PUBLIC_SENTRY_DSN: optionalEnv(process.env.NEXT_PUBLIC_SENTRY_DSN),
  NEXT_PUBLIC_VERCEL_ANALYTICS: optionalEnv(process.env.NEXT_PUBLIC_VERCEL_ANALYTICS),
  RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
  EMAIL_FROM: optionalEnv(process.env.EMAIL_FROM),
  STRIPE_SECRET_KEY: optionalEnv(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: optionalEnv(process.env.STRIPE_WEBHOOK_SECRET),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalEnv(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  CLOUDINARY_CLOUD_NAME: optionalEnv(process.env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: optionalEnv(process.env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: optionalEnv(process.env.CLOUDINARY_API_SECRET),
  NEXT_PUBLIC_SUPABASE_URL: optionalEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
});
