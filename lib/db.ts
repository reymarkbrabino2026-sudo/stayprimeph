import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { resolvePrismaDatasourceUrl } from "@/lib/prisma-datasource-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolvePrismaDatasourceUrl(env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
