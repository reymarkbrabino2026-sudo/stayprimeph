import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { hashSync } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const requiredConfirmation = "bootstrap-admin-once";
const forbiddenAdminEmails = new Set([
  "admin@stayprimeph.com",
  "guest@stayprimeph.com",
  "host@stayprimeph.com",
]);

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "StayPrimePH Admin";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
const confirmation = process.env.BOOTSTRAP_ADMIN_CONFIRM;
const dryRun = process.env.DRY_RUN === "1";
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskEmail(value) {
  const [local = "", domain = ""] = String(value ?? "").split("@");
  if (!domain) return "[redacted]";
  const safeLocal = local.length <= 2 ? `${local[0] ?? "*"}***` : `${local[0]}***${local.at(-1)}`;
  return `${safeLocal}@${domain.toLowerCase()}`;
}

function sanitizeMessage(value) {
  return String(value).replace(emailPattern, (match) => maskEmail(match));
}

function initials(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || "SA";
}

function normalizedPassword(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function identityTokens() {
  const tokens = new Set();
  if (email) {
    tokens.add(email);
    const [localPart] = email.split("@");
    if (localPart && localPart.length >= 3) tokens.add(localPart);
  }

  for (const part of name.toLowerCase().split(/[^a-z0-9]+/i)) {
    const token = part.trim();
    if (token.length >= 3) tokens.add(token);
  }

  return [...tokens];
}

function validateInputs() {
  if (confirmation !== requiredConfirmation) {
    throw new Error(`Set BOOTSTRAP_ADMIN_CONFIRM=${requiredConfirmation} to confirm this one-time bootstrap.`);
  }

  if (!email || !validEmail(email)) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL to the real administrator email address.");
  }

  if (forbiddenAdminEmails.has(email) || email.endsWith("@example.com") || email.endsWith("@deleted.stayprimeph.local")) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a real operator-controlled email, not a demo/default address.");
  }

  const compactPassword = normalizedPassword(password);
  const containsIdentity = identityTokens().some((token) => {
    const compactToken = normalizedPassword(token);
    return compactToken.length >= 3 && compactPassword.includes(compactToken);
  });
  const weakPasswords = new Set(["admin123", "changeme123", "password123", "stayprimeph123", "welcome123"]);

  if (
    password.length < 16 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password) ||
    weakPasswords.has(compactPassword) ||
    containsIdentity
  ) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be 16+ chars, include upper/lower/number/symbol, and not contain admin identity details.");
  }
}

async function main() {
  validateInputs();

  const prisma = new PrismaClient();

  try {
    const activeAdmin = await prisma.user.findFirst({
      where: {
        role: "admin",
        password: { not: null },
      },
      select: { id: true, email: true },
    });

    if (activeAdmin) {
      throw new Error(`Active admin already exists (${maskEmail(activeAdmin.email)}). Bootstrap is one-time only.`);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    const now = new Date();
    const passwordHash = hashSync(password, 12);
    const action = existingUser ? "promote existing user to admin" : "create first admin user";

    if (dryRun) {
      console.log(`Dry run only. Would ${action} for ${maskEmail(email)}.`);
      return;
    }

    const admin = await prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name,
              password: passwordHash,
              role: "admin",
              avatar: initials(name),
              emailVerifiedAt: now,
              passwordChangedAt: now,
            },
          })
        : await tx.user.create({
            data: {
              id: randomUUID(),
              name,
              email: email,
              password: passwordHash,
              role: "admin",
              avatar: initials(name),
              phone: "",
              emailVerifiedAt: now,
              passwordChangedAt: now,
              createdAt: now,
            },
          });

      await tx.authToken.deleteMany({ where: { userId: user.id } });
      await tx.adminLog.create({
        data: {
          id: randomUUID(),
          adminId: user.id,
          action: existingUser ? "admin_bootstrap_promoted_user" : "admin_bootstrap_created_user",
          entityType: "User",
          entityId: user.id,
        },
      });

      return user;
    });

    console.log(`Admin bootstrap complete for ${maskEmail(admin.email)}. Clear BOOTSTRAP_ADMIN_* secrets now.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(sanitizeMessage(error instanceof Error ? error.message : error));
  process.exit(1);
});
