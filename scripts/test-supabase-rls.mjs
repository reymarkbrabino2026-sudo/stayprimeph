import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectRoot);

const databaseUrl = process.env.RLS_TEST_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set RLS_TEST_DATABASE_URL or DATABASE_URL before running the RLS test.");
}

function assertNonProductionDatabase(url) {
  if (process.env.ALLOW_RLS_TEST_ON_CURRENT_DB === "1") return;

  const parsed = new URL(url);
  const safeHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const safeDatabaseNames = new Set(["stayprimeph_rls_test", "stayprimeph_test", "stayprimeph"]);

  if (!safeHosts.has(parsed.hostname) || !safeDatabaseNames.has(parsed.pathname.replace(/^\//, ""))) {
    throw new Error(
      "Refusing to run RLS integration tests against a non-local database. " +
        "Use RLS_TEST_DATABASE_URL for an isolated local/test database, or set ALLOW_RLS_TEST_ON_CURRENT_DB=1 only for a disposable database.",
    );
  }
}

assertNonProductionDatabase(databaseUrl);

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = process.env.DIRECT_URL ?? databaseUrl;

const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");

function prisma() {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ["error"],
  });
}

function executeScript(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "stayprimeph-rls-"));
  const scriptPath = path.join(tempDir, "script.sql");

  try {
    writeFileSync(scriptPath, sql, "utf8");
    execFileSync(process.execPath, [prismaCli, "db", "execute", "--schema", "prisma/schema.prisma", "--file", scriptPath], {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DIRECT_URL: process.env.DIRECT_URL ?? databaseUrl,
      },
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function query(sql) {
  const db = prisma();
  try {
    return await db.$queryRawUnsafe(sql);
  } finally {
    await db.$disconnect();
  }
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function uuidFor(label) {
  const hex = createHash("sha256").update(`stayprimeph-rls-${label}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function ensureSupabaseCompatibility() {
  executeScript(`
    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END
    $$;

    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  `);
}

function runPrismaMigrations() {
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: process.env.DIRECT_URL ?? databaseUrl,
    },
  });
}

async function applySupabaseMigrations() {
  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    console.log(`Applying Supabase migration ${file}`);
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    executeScript(sql);
  }
}

const ids = {
  guestAuth: uuidFor("guest"),
  otherGuestAuth: uuidFor("other-guest"),
  hostAuth: uuidFor("host"),
  otherHostAuth: uuidFor("other-host"),
  adminAuth: uuidFor("admin"),
};

const users = {
  guest: `supabase-${ids.guestAuth}`,
  otherGuest: `supabase-${ids.otherGuestAuth}`,
  host: `supabase-${ids.hostAuth}`,
  otherHost: `supabase-${ids.otherHostAuth}`,
  admin: `supabase-${ids.adminAuth}`,
};

async function seedFixtures() {
  executeScript(`
    DELETE FROM "AdminLog" WHERE "id" LIKE 'rls-%';
    DELETE FROM "AuditLog" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Report" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Payout" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Cancellation" WHERE "id" LIKE 'rls-%';
    DELETE FROM "AuthSession" WHERE "id" LIKE 'rls-%';
    DELETE FROM "AuthToken" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Payment" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Message" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Review" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Wishlist" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Booking" WHERE "id" LIKE 'rls-%';
    DELETE FROM "ListingBookingPackage" WHERE "id" LIKE 'rls-%';
    DELETE FROM "AvailabilityBlock" WHERE "id" LIKE 'rls-%';
    DELETE FROM "ListingAvailability" WHERE "id" LIKE 'rls-%';
    DELETE FROM "ListingPricing" WHERE "id" LIKE 'rls-%';
    DELETE FROM "ListingLocation" WHERE "id" LIKE 'rls-%';
    DELETE FROM "PropertyImage" WHERE "id" LIKE 'rls-%';
    DELETE FROM "PropertyAmenity" WHERE "propertyId" LIKE 'rls-%';
    DELETE FROM "HostExpense" WHERE "id" LIKE 'rls-%';
    DELETE FROM "HostMonthlyReport" WHERE "id" LIKE 'rls-%';
    DELETE FROM "PlatformLedgerEntry" WHERE "id" LIKE 'rls-%';
    DELETE FROM "HostProfile" WHERE "id" LIKE 'rls-%';
    DELETE FROM "Property" WHERE "id" LIKE 'rls-%';
    DELETE FROM "AccountSettings" WHERE "id" LIKE 'rls-%';
    DELETE FROM "User" WHERE "id" LIKE 'supabase-${uuidFor("guest").slice(0, 8)}%' OR "id" IN (${Object.values(users).map(sqlString).join(", ")});

    INSERT INTO "User" ("id", "name", "email", "role", "emailVerifiedAt")
    VALUES
      (${sqlString(users.guest)}, 'RLS Guest', 'rls-guest@example.test', 'guest', now()),
      (${sqlString(users.otherGuest)}, 'RLS Other Guest', 'rls-other-guest@example.test', 'guest', now()),
      (${sqlString(users.host)}, 'RLS Host', 'rls-host@example.test', 'host', now()),
      (${sqlString(users.otherHost)}, 'RLS Other Host', 'rls-other-host@example.test', 'host', now()),
      (${sqlString(users.admin)}, 'RLS Admin', 'rls-admin@example.test', 'admin', now());

    INSERT INTO "Property" (
      "id", "hostId", "slug", "title", "description", "address", "city", "country",
      "pricePerNight", "bedrooms", "bathrooms", "maxGuests", "propertyType", "status", "rules"
    )
    VALUES
      ('rls-approved-property', ${sqlString(users.host)}, 'rls-approved-property', 'Approved RLS Property', 'Visible approved listing', 'Address', 'City', 'PH', 1000, 1, 1, 2, 'room', 'approved', 'Rules'),
      ('rls-pending-property', ${sqlString(users.host)}, 'rls-pending-property', 'Pending RLS Property', 'Host-only pending listing', 'Address', 'City', 'PH', 1000, 1, 1, 2, 'room', 'pending', 'Rules'),
      ('rls-other-pending-property', ${sqlString(users.otherHost)}, 'rls-other-pending-property', 'Other Pending RLS Property', 'Other host pending listing', 'Address', 'City', 'PH', 1000, 1, 1, 2, 'room', 'pending', 'Rules');

    INSERT INTO "ListingBookingPackage" (
      "id", "propertyId", "name", "accessType", "unit", "weekdayRate", "weekendRate", "includedGuests",
      "maxGuests", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime", "enabled"
    )
    VALUES
      ('rls-enabled-package', 'rls-approved-property', 'Enabled Package', 'overnight', 'night', 1000, 1200, 2, 4, 100, 50, '14:00', '11:00', true),
      ('rls-disabled-package', 'rls-approved-property', 'Disabled Package', 'overnight', 'night', 1000, 1200, 2, 4, 100, 50, '14:00', '11:00', false);

    INSERT INTO "Booking" (
      "id", "propertyId", "guestId", "hostId", "checkIn", "checkOut", "guests", "totalPrice", "status", "paymentStatus"
    )
    VALUES
      ('rls-booking', 'rls-approved-property', ${sqlString(users.guest)}, ${sqlString(users.host)}, now() - interval '3 days', now() - interval '2 days', 2, 1000, 'completed', 'paid'),
      ('rls-other-booking', 'rls-approved-property', ${sqlString(users.otherGuest)}, ${sqlString(users.host)}, now() - interval '1 day', now() + interval '1 day', 2, 1000, 'confirmed', 'paid');

    INSERT INTO "Payment" (
      "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus", "transactionId", "submittedAt", "confirmedAt"
    )
    VALUES
      ('rls-payment', 'rls-booking', ${sqlString(users.guest)}, ${sqlString(users.host)}, 1000, 'other', 'paid', 'rls-txn-1', now(), now()),
      ('rls-other-payment', 'rls-other-booking', ${sqlString(users.otherGuest)}, ${sqlString(users.host)}, 1000, 'other', 'paid', 'rls-txn-2', now(), now());

    INSERT INTO "Message" ("id", "senderId", "receiverId", "bookingId", "propertyId", "message")
    VALUES
      ('rls-message', ${sqlString(users.guest)}, ${sqlString(users.host)}, 'rls-booking', NULL, 'Guest-host message'),
      ('rls-other-message', ${sqlString(users.otherGuest)}, ${sqlString(users.host)}, 'rls-other-booking', NULL, 'Other guest-host message');

    INSERT INTO "Wishlist" ("id", "userId", "propertyId")
    VALUES ('rls-wishlist', ${sqlString(users.guest)}, 'rls-approved-property');

    INSERT INTO "Report" ("id", "propertyId", "reporterId", "type", "status", "details")
    VALUES ('rls-report', 'rls-approved-property', ${sqlString(users.guest)}, 'listing', 'open', 'Report details');

    INSERT INTO "Payout" ("id", "hostId", "amount", "status", "availableOn")
    VALUES ('rls-payout', ${sqlString(users.host)}, 800, 'pending', now());

    INSERT INTO "AdminLog" ("id", "adminId", "action", "entityType", "entityId")
    VALUES ('rls-admin-log', ${sqlString(users.admin)}, 'rls_test', 'Property', 'rls-approved-property');

    INSERT INTO "AuditLog" ("id", "actorId", "actorRole", "action", "entityType", "entityId", "metadata")
    VALUES ('rls-audit-log', ${sqlString(users.admin)}, 'admin', 'listing.approved', 'Property', 'rls-approved-property', '{"source":"rls-test"}');

    INSERT INTO "PlatformLedgerEntry" ("id", "bookingId", "paymentId", "amount", "source", "destination", "status")
    VALUES ('rls-ledger', 'rls-booking', 'rls-payment', 1000, 'manual_payment', 'stayprime_bank', 'banked');

    INSERT INTO "HostExpense" ("id", "hostId", "expenseDate", "month", "category", "amount", "vendor")
    VALUES ('rls-host-expense', ${sqlString(users.host)}, now(), '2026-06', 'Supplies', 100, 'Vendor');

    INSERT INTO "HostMonthlyReport" ("id", "hostId", "month", "salesAmount", "expensesAmount")
    VALUES ('rls-host-monthly-report', ${sqlString(users.host)}, '2026-06', 1000, 100);

    INSERT INTO "AuthToken" ("id", "userId", "tokenHash", "type", "expiresAt")
    VALUES ('rls-auth-token', ${sqlString(users.guest)}, 'rls-token-hash', 'email_verification', now() + interval '1 day');

    INSERT INTO "AuthSession" ("id", "userId", "sessionHash", "expiresAt")
    VALUES ('rls-auth-session', ${sqlString(users.guest)}, 'rls-session-hash', now() + interval '1 day');

    INSERT INTO "AccountSettings" (
      "id", "userId", "personalInfo", "notificationPreferences", "privacy", "bookingPermissions",
      "workTravel", "professionalHostingTools", "financial"
    )
    VALUES (
      'rls-account-settings', ${sqlString(users.guest)}, '{}', '{}', '{}', '{}', '{}', '{}', '{}'
    );
  `);
}

const contexts = {
  anon: { role: "anon", authId: null },
  guest: { role: "authenticated", authId: ids.guestAuth },
  host: { role: "authenticated", authId: ids.hostAuth },
  admin: { role: "authenticated", authId: ids.adminAuth },
};

async function countAs(context, tableName, whereSql = "true") {
  const db = prisma();
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${context.role}`);
      await tx.$executeRawUnsafe("SELECT set_config('request.jwt.claim.sub', $1, true)", context.authId ?? "");
      const rows = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${tableName}" WHERE ${whereSql}`);
      return Number(rows[0]?.count ?? 0);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("permission denied")) return 0;
    throw error;
  } finally {
    await db.$disconnect();
  }
}

async function canInsertAs(context, tableName, insertSql) {
  const db = prisma();
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${context.role}`);
      await tx.$executeRawUnsafe("SELECT set_config('request.jwt.claim.sub', $1, true)", context.authId ?? "");
      await tx.$executeRawUnsafe(`INSERT INTO "${tableName}" ${insertSql}`);
      throw new Error("rollback-after-success");
    }).catch((error) => {
      if (error.message !== "rollback-after-success") throw error;
    });
    return true;
  } catch {
    return false;
  } finally {
    await db.$disconnect();
  }
}

async function publicTablesWithoutRls() {
  const rows = await query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  `);

  return rows.map((row) => row.relname);
}

const checks = [
  [
    "all public app tables have RLS enabled",
    async () => {
      const tables = await publicTablesWithoutRls();
      if (tables.length > 0) {
        console.error(`Public tables without RLS: ${tables.join(", ")}`);
      }
      return tables.length === 0;
    },
  ],

  ["anon sees only approved listings", () => countAs(contexts.anon, "Property", `"id" LIKE 'rls-%'`) === 1],
  ["anon cannot read bookings", () => countAs(contexts.anon, "Booking", `"id" LIKE 'rls-%'`) === 0],
  ["anon cannot read payments", () => countAs(contexts.anon, "Payment", `"id" LIKE 'rls-%'`) === 0],
  ["anon cannot read auth sessions", () => countAs(contexts.anon, "AuthSession", `"id" LIKE 'rls-%'`) === 0],

  ["guest sees approved listing only", () => countAs(contexts.guest, "Property", `"id" LIKE 'rls-%'`) === 1],
  ["guest sees own booking only", () => countAs(contexts.guest, "Booking", `"id" LIKE 'rls-%'`) === 1],
  ["guest sees own payment only", () => countAs(contexts.guest, "Payment", `"id" LIKE 'rls-%'`) === 1],
  ["guest sees own message only", () => countAs(contexts.guest, "Message", `"id" LIKE 'rls-%'`) === 1],
  ["guest sees own wishlist only", () => countAs(contexts.guest, "Wishlist", `"id" LIKE 'rls-%'`) === 1],
  ["guest sees own account settings", () => countAs(contexts.guest, "AccountSettings", `"id" LIKE 'rls-%'`) === 1],
  ["guest cannot read auth tokens", () => countAs(contexts.guest, "AuthToken", `"id" LIKE 'rls-%'`) === 0],
  ["guest cannot read admin logs", () => countAs(contexts.guest, "AdminLog", `"id" LIKE 'rls-%'`) === 0],
  ["guest cannot read audit logs", () => countAs(contexts.guest, "AuditLog", `"id" LIKE 'rls-%'`) === 0],
  ["guest cannot read platform ledger", () => countAs(contexts.guest, "PlatformLedgerEntry", `"id" LIKE 'rls-%'`) === 0],
  ["guest can insert own wishlist", () => canInsertAs(contexts.guest, "Wishlist", `("id", "userId", "propertyId") VALUES ('rls-temp-wishlist', ${sqlString(users.guest)}, 'rls-approved-property')`)],
  ["guest cannot insert wishlist for another user", async () => !(await canInsertAs(contexts.guest, "Wishlist", `("id", "userId", "propertyId") VALUES ('rls-temp-bad-wishlist', ${sqlString(users.otherGuest)}, 'rls-approved-property')`))],

  ["host sees own pending and approved listings", () => countAs(contexts.host, "Property", `"id" LIKE 'rls-%'`) === 2],
  ["host does not see other host pending listing", () => countAs(contexts.host, "Property", `"id" = 'rls-other-pending-property'`) === 0],
  ["host sees bookings for own listing", () => countAs(contexts.host, "Booking", `"id" LIKE 'rls-%'`) === 2],
  ["host sees payments for own listing", () => countAs(contexts.host, "Payment", `"id" LIKE 'rls-%'`) === 2],
  ["host sees own host expense", () => countAs(contexts.host, "HostExpense", `"id" LIKE 'rls-%'`) === 1],
  ["host sees own monthly report", () => countAs(contexts.host, "HostMonthlyReport", `"id" LIKE 'rls-%'`) === 1],
  ["host sees disabled package for own listing", () => countAs(contexts.host, "ListingBookingPackage", `"id" = 'rls-disabled-package'`) === 1],
  ["host cannot read platform ledger", () => countAs(contexts.host, "PlatformLedgerEntry", `"id" LIKE 'rls-%'`) === 0],

  ["admin sees all RLS listings", () => countAs(contexts.admin, "Property", `"id" LIKE 'rls-%'`) === 3],
  ["admin sees all bookings", () => countAs(contexts.admin, "Booking", `"id" LIKE 'rls-%'`) === 2],
  ["admin sees all payments", () => countAs(contexts.admin, "Payment", `"id" LIKE 'rls-%'`) === 2],
  ["admin sees admin logs", () => countAs(contexts.admin, "AdminLog", `"id" LIKE 'rls-%'`) === 1],
  ["admin sees audit logs", () => countAs(contexts.admin, "AuditLog", `"id" LIKE 'rls-%'`) === 1],
  ["admin sees platform ledger", () => countAs(contexts.admin, "PlatformLedgerEntry", `"id" LIKE 'rls-%'`) === 1],
  ["admin cannot read auth sessions through client role", () => countAs(contexts.admin, "AuthSession", `"id" LIKE 'rls-%'`) === 0],
  ["admin cannot read auth tokens through client role", () => countAs(contexts.admin, "AuthToken", `"id" LIKE 'rls-%'`) === 0],
];

async function runChecks() {
  const failures = [];

  for (const [name, fn] of checks) {
    const passed = await fn();
    if (passed) {
      console.log(`PASS ${name}`);
    } else {
      console.error(`FAIL ${name}`);
      failures.push(name);
    }
  }

  if (failures.length > 0) {
    throw new Error(`RLS checks failed: ${failures.join(", ")}`);
  }
}

async function main() {
  await ensureSupabaseCompatibility();
  runPrismaMigrations();
  await ensureSupabaseCompatibility();
  await applySupabaseMigrations();

  const requiredTables = await query(`
    SELECT count(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('User', 'Property', 'Booking', 'Payment', 'AuthSession', 'ListingBookingPackage')
  `);

  if (Number(requiredTables[0]?.count ?? 0) !== 6) {
    throw new Error("Database schema is incomplete after migrations; cannot run RLS tests.");
  }

  await seedFixtures();
  await runChecks();
  console.log("RLS context tests passed for anon, authenticated guest, host, and admin.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
