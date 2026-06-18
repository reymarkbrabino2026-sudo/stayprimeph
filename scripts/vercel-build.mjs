import { spawnSync } from "node:child_process";

const dummyDatabaseUrl = "postgresql://unused:unused@localhost:5432/unused?schema=public";

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

function run(command, args) {
  const result = spawnSync(command, args, {
    env: buildTimeEnv,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running Vercel build with sanitized build-time placeholders. Production secrets are required only at runtime.");
run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
