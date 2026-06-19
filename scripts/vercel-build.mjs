import { spawnSync } from "node:child_process";

const dummyDatabaseUrl = "postgresql://unused:unused@localhost:5432/unused?schema=public";

function optionalEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return undefined;
  return trimmed;
}

function enabled(value) {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

function migrationNames(value) {
  return (optionalEnv(value) ?? "")
    .split(/[,\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

function deployPrismaMigrationsIfEnabled() {
  if (!enabled(process.env.PRISMA_MIGRATE_DEPLOY)) return;

  if (process.env.VERCEL_ENV !== "production") {
    console.log("Skipping Prisma migration deploy outside Vercel production.");
    return;
  }

  const databaseUrl = optionalEnv(process.env.DATABASE_URL)
    ?? optionalEnv(process.env.POSTGRES_PRISMA_URL)
    ?? optionalEnv(process.env.POSTGRES_URL);
  const directUrl = optionalEnv(process.env.DIRECT_URL)
    ?? optionalEnv(process.env.POSTGRES_URL_NON_POOLING)
    ?? databaseUrl;

  if (!databaseUrl || !directUrl) {
    console.error("PRISMA_MIGRATE_DEPLOY is enabled, but production database URLs are missing.");
    process.exit(1);
  }

  const migrateEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  };

  for (const migrationName of migrationNames(process.env.PRISMA_MIGRATE_RESOLVE_APPLIED)) {
    console.log(`Marking production Prisma migration as applied: ${migrationName}`);
    run("npx", ["prisma", "migrate", "resolve", "--applied", migrationName], migrateEnv);
  }

  console.log("Running Prisma production migrations before the sanitized Vercel build.");
  run("npx", ["prisma", "migrate", "deploy"], migrateEnv);
}

const buildTimeEnv = {
  ...process.env,
  DATABASE_URL: dummyDatabaseUrl,
  DIRECT_URL: dummyDatabaseUrl,
  AUTH_SECRET: "build-time-placeholder-with-32-plus-characters",
  PERSISTENCE_DRIVER: "json",
  STAYPRIMEPH_BUILD_PHASE: "1",
  PAYMENT_LAUNCH_MODE: "disabled",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  SENTRY_DSN: "",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  BLOB_READ_WRITE_TOKEN: "",
  PHOTO_BLOB_READ_WRITE_TOKEN: "",
};

buildTimeEnv.NEXT_PUBLIC_APP_URL ||= process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";
buildTimeEnv.NEXT_PUBLIC_VERCEL_ANALYTICS ||= "disabled";

deployPrismaMigrationsIfEnabled();
console.log("Running Vercel build with sanitized build-time placeholders. Production secrets are required only at runtime.");
run("npx", ["prisma", "generate"], buildTimeEnv);
run("npx", ["next", "build"], buildTimeEnv);
