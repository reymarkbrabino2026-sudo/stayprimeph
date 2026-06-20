import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { resolvePrismaDatasourceUrl } from "@/lib/prisma-datasource-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Prefer the Supabase connection pooler (pgbouncer) for the Prisma datasource so
// serverless invocations reuse pooled connections instead of opening a fresh
// direct connection each time. Falls back to DATABASE_URL when the pooler URLs
// (provided by the Supabase/Vercel integration) are not present.
const prismaDatasourceUrl = resolvePrismaDatasourceUrl(
  env.POSTGRES_PRISMA_URL ?? env.POSTGRES_URL ?? env.DATABASE_URL,
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: prismaDatasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
