import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const environment = process.argv[2] ?? process.env.NODE_ENV ?? "development";

const requiredByEnvironment = {
  development: ["DATABASE_URL", "NEXT_PUBLIC_APP_URL", "AUTH_SECRET", "PERSISTENCE_DRIVER"],
  test: ["DATABASE_URL", "NEXT_PUBLIC_APP_URL", "AUTH_SECRET", "PERSISTENCE_DRIVER"],
  production: ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_APP_URL", "AUTH_SECRET", "PERSISTENCE_DRIVER"],
};

const required = requiredByEnvironment[environment] ?? requiredByEnvironment.development;
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required ${environment} environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (environment === "production" && process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
  console.error("NEXT_PUBLIC_APP_URL must use your real production domain in production.");
  process.exit(1);
}

if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
  console.error("AUTH_SECRET must be at least 32 characters.");
  process.exit(1);
}

if (environment === "production") {
  if (process.env.PERSISTENCE_DRIVER !== "prisma") {
    console.error("PERSISTENCE_DRIVER must be prisma in production.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.startsWith("postgresql://") && !process.env.DATABASE_URL?.startsWith("postgres://")) {
    console.error("DATABASE_URL must be a PostgreSQL connection string in production.");
    process.exit(1);
  }
  if (!process.env.DIRECT_URL?.startsWith("postgresql://") && !process.env.DIRECT_URL?.startsWith("postgres://")) {
    console.error("DIRECT_URL must be a PostgreSQL direct connection string in production.");
    process.exit(1);
  }
  const integrationPairs = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
    ["RESEND_API_KEY", "EMAIL_FROM"],
    ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY"],
  ];
  for (const [first, second] of integrationPairs) {
    if (!process.env[first] || !process.env[second]) {
      console.error(`${first} and ${second} are required in production.`);
      process.exit(1);
    }
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.error("CLOUDINARY_API_SECRET is required in production.");
    process.exit(1);
  }
}

console.log(`Environment looks ready for ${environment}.`);
