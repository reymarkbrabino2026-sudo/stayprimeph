import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { hashSync } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const adminEmail = "admin@stayprimeph.com";
const demoAccountSelectors = [
  { id: "demo-admin" },
  { id: "demo-guest" },
  { id: "demo-host" },
  { email: "guest@stayprimeph.com" },
  { email: "host@stayprimeph.com" },
];

const adminPassword = process.env.ROTATE_ADMIN_PASSWORD;
const adminNewEmail = process.env.ROTATE_ADMIN_EMAIL?.trim().toLowerCase();
const dryRun = process.env.DRY_RUN === "1";

function strongEnough(password) {
  return (
    password.length >= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function unusablePasswordHash() {
  return hashSync(randomBytes(48).toString("base64url"), 12);
}

function operatorPasswordHash() {
  if (!adminPassword) {
    throw new Error("Set ROTATE_ADMIN_PASSWORD to the new admin password before running this script.");
  }

  if (!strongEnough(adminPassword)) {
    throw new Error("ROTATE_ADMIN_PASSWORD must be 16+ chars and include uppercase, lowercase, number, and symbol.");
  }

  return hashSync(adminPassword, 12);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const updates = [];
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true },
    });

    if (admin) {
      updates.push({
        label: `rotate ${admin.email}`,
        run: () =>
          prisma.user.update({
            where: { id: admin.id },
            data: {
              email: adminNewEmail || admin.email,
              password: operatorPasswordHash(),
              passwordChangedAt: now,
              emailVerifiedAt: now,
            },
          }),
      });
    }

    const demoUsers = await prisma.user.findMany({
      where: { OR: demoAccountSelectors },
      select: { id: true, email: true },
    });

    for (const user of demoUsers) {
      if (user.email === adminEmail && admin) continue;
      updates.push({
        label: `invalidate demo credentials for ${user.email}`,
        run: () =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              password: unusablePasswordHash(),
              passwordChangedAt: now,
            },
          }),
      });
    }

    if (updates.length === 0) {
      console.log("No seeded admin or demo accounts were found.");
      return;
    }

    if (dryRun) {
      console.log(`Dry run only. Would apply ${updates.length} credential update(s):`);
      for (const update of updates) console.log(`- ${update.label}`);
      return;
    }

    for (const update of updates) {
      await update.run();
      console.log(`Applied: ${update.label}`);
    }

    console.log("Seeded credential rotation complete. Old demo/admin passwords are no longer valid.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
