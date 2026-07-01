import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { bookingBlocksRequestedPackage } from "@/lib/booking-conflicts";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeListingPhotoCategory } from "@/lib/listing-photo-categories";
import { bookingBlocksListingDelete } from "@/lib/listing-delete-guards";
import { duplicatePaymentReferenceMessage } from "@/lib/payment-references";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import type { AdminLog, AuditLog, AuditLogAction, AuthSession, AuthToken, AvailabilityBlock, Booking, BookingPackage, Cancellation, HostCustomerClassification, HostCustomerProfile, HostExpense, HostMonthlyReport, ListingRateAdjustment, Message, Passkey, Payment, Payout, PlatformLedgerEntry, Property, PropertyImage, PropertyRoom, PublicListingSummary, Review, SeasonalRate, User } from "@/lib/types";

function toPropertyImage(image: { id: string; propertyId: string; imageUrl: string; tone: string | null; category?: string | null }): PropertyImage {
  return {
    id: image.id,
    propertyId: image.propertyId,
    imageUrl: image.imageUrl,
    tone: image.tone ?? "from-rose-100 via-orange-50 to-stone-100",
    category: normalizeListingPhotoCategory(image.category),
  };
}

function parseRules(rules: string) {
  try {
    return JSON.parse(rules) as string[];
  } catch {
    return rules ? [rules] : [];
  }
}

export function usesPrismaPersistence() {
  return env.PERSISTENCE_DRIVER === "prisma";
}

function shouldSkipRuntimeSchemaEnsure() {
  return process.env.NODE_ENV === "production" && process.env.STAYPRIMEPH_BUILD_PHASE !== "1";
}

let platformLedgerTableReady: Promise<void> | null = null;
let listingBookingPackageTableReady: Promise<void> | null = null;
let listingRoomTableReady: Promise<void> | null = null;
let bookingPackageColumnsReady: Promise<void> | null = null;
let availabilityBlockBookingPackageColumnsReady: Promise<void> | null = null;
let propertyAdvancedPricingColumnsReady: Promise<void> | null = null;
let paymentColumnsReady: Promise<void> | null = null;
let authSessionTableReady: Promise<void> | null = null;
let passkeyTableReady: Promise<void> | null = null;
let hostCustomerProfileTableReady: Promise<void> | null = null;

function cacheGlobalEnsure(db: unknown, cached: Promise<void> | null, setCached: (promise: Promise<void> | null) => void, ensure: () => Promise<void>) {
  // Production schema is managed by Prisma migrations; request-time DDL can block
  // behind active traffic and trip database statement timeouts.
  if (shouldSkipRuntimeSchemaEnsure()) return Promise.resolve();
  if (db !== prisma) return ensure();
  if (cached) return cached;

  const promise = ensure().catch((error) => {
    setCached(null);
    throw error;
  });
  setCached(promise);
  return promise;
}

async function insertAuditLog(
  db: Pick<Prisma.TransactionClient, "$executeRaw">,
  {
    id,
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    createdAt,
  }: AuditLog,
) {
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  await db.$executeRaw`
    INSERT INTO "AuditLog" (
      "id", "actorId", "actorRole", "action", "entityType", "entityId", "metadata", "createdAt"
    )
    VALUES (
      ${id}, ${actorId}, ${actorRole}, ${action}, ${entityType}, ${entityId}, ${metadataJson}::jsonb, ${new Date(createdAt)}
    )
  `;
}

export async function appendAuditLogInDatabase(auditLog: AuditLog) {
  await insertAuditLog(prisma, auditLog);
}

export async function appendAdminLogInDatabase(adminLog: AdminLog) {
  await prisma.adminLog.create({
    data: {
      id: adminLog.id,
      adminId: adminLog.adminId,
      action: adminLog.action,
      entityType: adminLog.entityType,
      entityId: adminLog.entityId,
      createdAt: new Date(adminLog.createdAt),
    },
  });
}

type DatabaseAuditLog = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

export async function listAuditLogsFromDatabase(limit = 50): Promise<AuditLog[]> {
  const logs = await prisma.$queryRaw<DatabaseAuditLog[]>`
    SELECT "id", "actorId", "actorRole", "action", "entityType", "entityId", "metadata", "createdAt"
    FROM "AuditLog"
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;

  return logs.map((log) => ({
    id: log.id,
    actorId: log.actorId,
    actorRole: log.actorRole as AuditLog["actorRole"],
    action: log.action as AuditLogAction,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? log.metadata as Record<string, unknown>
      : undefined,
    createdAt: log.createdAt.toISOString(),
  }));
}

function auditLogData({
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata,
  createdAt = new Date(),
}: {
  actorId: string;
  actorRole: AuditLog["actorRole"];
  action: AuditLogAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}): AuditLog {
  return {
    id: randomUUID(),
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: createdAt.toISOString(),
  };
}

async function ensurePlatformLedgerTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, platformLedgerTableReady, (promise) => {
    platformLedgerTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlatformLedgerEntry" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "paymentId" TEXT,
        "amount" INTEGER NOT NULL,
        "source" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PlatformLedgerEntry_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PlatformLedgerEntry_bookingId_key" ON "PlatformLedgerEntry"("bookingId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PlatformLedgerEntry_status_createdAt_idx" ON "PlatformLedgerEntry"("status", "createdAt")`);
  });
}

async function ensureListingBookingPackageTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, listingBookingPackageTableReady, (promise) => {
    listingBookingPackageTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ListingBookingPackage" (
        "id" TEXT NOT NULL,
        "propertyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "accessType" TEXT NOT NULL,
        "unit" TEXT NOT NULL,
        "weekdayRate" INTEGER NOT NULL,
        "weekendRate" INTEGER NOT NULL,
        "holidayRate" INTEGER,
        "holidayDates" JSONB,
        "seasonalRates" JSONB,
        "includedGuests" INTEGER NOT NULL,
        "maxGuests" INTEGER NOT NULL,
        "sleepingCapacity" INTEGER,
        "durationHours" INTEGER,
        "additionalGuestFee" INTEGER NOT NULL,
        "extensionHourlyFee" INTEGER NOT NULL,
        "checkInTime" TEXT NOT NULL,
        "checkOutTime" TEXT NOT NULL,
        "accessibleFloors" JSONB,
        "accessibleRoomIds" JSONB,
        "includedAmenities" JSONB,
        "excludedAmenities" JSONB,
        "availableDays" JSONB,
        "minimumAdvanceBookingDays" INTEGER NOT NULL DEFAULT 0,
        "blockedPackageIds" JSONB,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "ListingBookingPackage_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "description" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active'`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "sleepingCapacity" INTEGER`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "durationHours" INTEGER`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "holidayDates" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "seasonalRates" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "accessibleFloors" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "accessibleRoomIds" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "includedAmenities" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "excludedAmenities" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "availableDays" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "minimumAdvanceBookingDays" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingBookingPackage" ADD COLUMN IF NOT EXISTS "blockedPackageIds" JSONB`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ListingBookingPackage_propertyId_idx" ON "ListingBookingPackage"("propertyId")`);
  });
}

async function ensureListingRoomTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, listingRoomTableReady, (promise) => {
    listingRoomTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ListingRoom" (
        "id" TEXT NOT NULL,
        "propertyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "capacity" INTEGER NOT NULL,
        "floor" TEXT NOT NULL,
        "description" TEXT,
        "photoUrls" JSONB,
        "amenities" JSONB,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "ListingRoom_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ListingRoom_propertyId_idx" ON "ListingRoom"("propertyId")`);
  });
}

async function ensureBookingPackageColumns(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, bookingPackageColumnsReady, (promise) => {
    bookingPackageColumnsReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingPackageId" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingPackageName" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingPackageUnit" TEXT`);
  });
}

async function ensureAvailabilityBlockBookingPackageColumns(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, availabilityBlockBookingPackageColumnsReady, (promise) => {
    availabilityBlockBookingPackageColumnsReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`ALTER TABLE "AvailabilityBlock" ADD COLUMN IF NOT EXISTS "bookingPackageId" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "AvailabilityBlock" ADD COLUMN IF NOT EXISTS "bookingPackageName" TEXT`);
  });
}

async function ensurePropertyAdvancedPricingColumns(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, propertyAdvancedPricingColumnsReady, (promise) => {
    propertyAdvancedPricingColumnsReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "bookingType" TEXT NOT NULL DEFAULT 'stay'`);
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "virtualTourUrl" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "listingVideoUrl" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "privacyType" TEXT NOT NULL DEFAULT 'entire'`);
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "eventCapacity" INTEGER`);
    await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "sleepingCapacity" INTEGER`);
    await db.$executeRawUnsafe(`ALTER TABLE "PropertyImage" ADD COLUMN IF NOT EXISTS "category" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingPricing" ADD COLUMN IF NOT EXISTS "holidayPrice" INTEGER`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingPricing" ADD COLUMN IF NOT EXISTS "holidayDates" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "ListingPricing" ADD COLUMN IF NOT EXISTS "seasonalRates" JSONB`);
  });
}

async function ensurePaymentColumns(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, paymentColumnsReady, (promise) => {
    paymentColumnsReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "guestId" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "hostId" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptImageUrl" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "notes" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "confirmedBy" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Payment_hostId_paymentStatus_createdAt_idx" ON "Payment"("hostId", "paymentStatus", "createdAt")`);
  });
}

async function ensureAuthSessionTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, authSessionTableReady, (promise) => {
    authSessionTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuthSession" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "sessionHash" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "userAgent" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "mfaRole" TEXT`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_sessionHash_key" ON "AuthSession"("sessionHash")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuthSession_userId_createdAt_idx" ON "AuthSession"("userId", "createdAt")`);
  });
}

async function ensurePasskeyTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, passkeyTableReady, (promise) => {
    passkeyTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Passkey" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "credentialId" TEXT NOT NULL,
        "publicKey" TEXT NOT NULL,
        "counter" INTEGER NOT NULL DEFAULT 0,
        "name" TEXT NOT NULL,
        "transports" JSONB,
        "deviceType" TEXT NOT NULL,
        "backedUp" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastUsedAt" TIMESTAMP(3),
        CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "counter" INTEGER NOT NULL DEFAULT 0`);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Passkey'`);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "transports" JSONB`);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "deviceType" TEXT NOT NULL DEFAULT 'singleDevice'`);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "backedUp" BOOLEAN NOT NULL DEFAULT false`);
    await db.$executeRawUnsafe(`ALTER TABLE "Passkey" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3)`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Passkey_credentialId_key" ON "Passkey"("credentialId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Passkey_userId_createdAt_idx" ON "Passkey"("userId", "createdAt")`);
  });
}

async function ensureHostCustomerProfileTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
  return cacheGlobalEnsure(db, hostCustomerProfileTableReady, (promise) => {
    hostCustomerProfileTableReady = promise;
  }, async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HostCustomerProfile" (
        "id" TEXT NOT NULL,
        "hostId" TEXT NOT NULL,
        "guestId" TEXT NOT NULL,
        "classification" TEXT NOT NULL DEFAULT 'ordinary',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HostCustomerProfile_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`ALTER TABLE "HostCustomerProfile" ADD COLUMN IF NOT EXISTS "classification" TEXT NOT NULL DEFAULT 'ordinary'`);
    await db.$executeRawUnsafe(`ALTER TABLE "HostCustomerProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await db.$executeRawUnsafe(`ALTER TABLE "HostCustomerProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "HostCustomerProfile_hostId_guestId_key" ON "HostCustomerProfile"("hostId", "guestId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HostCustomerProfile_hostId_idx" ON "HostCustomerProfile"("hostId")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HostCustomerProfile_guestId_idx" ON "HostCustomerProfile"("guestId")`);
  });
}

async function recordPlatformLedgerEntry(
  db: Pick<typeof prisma, "$executeRaw" | "$executeRawUnsafe">,
  {
    bookingId,
    paymentId,
    totalPrice,
    source,
    createdAt,
  }: {
    bookingId: string;
    paymentId: string;
    totalPrice: number;
    source: PlatformLedgerEntry["source"];
    createdAt: Date;
  },
) {
  await ensurePlatformLedgerTable(db);
  await db.$executeRaw`
    INSERT INTO "PlatformLedgerEntry" (
      "id", "bookingId", "paymentId", "amount", "source", "destination", "status", "createdAt"
    )
    VALUES (
      ${`platform-${bookingId}`}, ${bookingId}, ${paymentId},
      ${calculateStayprimeMarkupFromTotal(totalPrice)}, ${source}, ${"stayprime_bank"}, ${"banked"}, ${createdAt}
    )
    ON CONFLICT ("bookingId") DO UPDATE SET
      "paymentId" = EXCLUDED."paymentId",
      "amount" = EXCLUDED."amount",
      "source" = EXCLUDED."source",
      "destination" = EXCLUDED."destination",
      "status" = EXCLUDED."status"
  `;
}

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  password: string | null;
  role: string;
  avatar: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
};

function toUser(user: DatabaseUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as User["role"],
    avatar: user.avatar ?? "",
    phone: user.phone ?? "",
    createdAt: user.createdAt.toISOString().slice(0, 10),
    passwordHash: user.password ?? undefined,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    passwordChangedAt: user.passwordChangedAt?.toISOString(),
  };
}

export async function listUsersFromDatabase(): Promise<User[]> {
  const users = await prisma.$queryRaw<DatabaseUser[]>`
    SELECT
      "id", "name", "email", "password", "role", "avatar", "phone",
      "emailVerifiedAt", "passwordChangedAt", "createdAt"
    FROM "User"
    ORDER BY "createdAt" DESC
  `;
  return users.map(toUser);
}

export async function findUserByIdFromDatabase(id: string): Promise<User | null> {
  const users = await prisma.$queryRaw<DatabaseUser[]>`
    SELECT
      "id", "name", "email", "password", "role", "avatar", "phone",
      "emailVerifiedAt", "passwordChangedAt", "createdAt"
    FROM "User"
    WHERE "id" = ${id}
    LIMIT 1
  `;
  const user = users[0];
  return user ? toUser(user) : null;
}

export async function listUsersByIdsFromDatabase(ids: string[]): Promise<User[]> {
  if (!ids.length) return [];
  const users = await prisma.$queryRaw<DatabaseUser[]>`
    SELECT
      "id", "name", "email", "password", "role", "avatar", "phone",
      "emailVerifiedAt", "passwordChangedAt", "createdAt"
    FROM "User"
    WHERE "id" IN (${Prisma.join(ids)})
  `;
  return users.map(toUser);
}

export async function createUserInDatabase(user: User) {
  await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      createdAt: new Date(user.createdAt),
      emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
    },
  });
}

type DatabaseBookingPackage = {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  status: string | null;
  displayOrder: number | null;
  accessType: string;
  unit: string;
  weekdayRate: number;
  weekendRate: number;
  holidayRate: number | null;
  holidayDates: Prisma.JsonValue | null;
  seasonalRates: Prisma.JsonValue | null;
  includedGuests: number;
  maxGuests: number;
  sleepingCapacity: number | null;
  durationHours: number | null;
  additionalGuestFee: number;
  extensionHourlyFee: number;
  checkInTime: string;
  checkOutTime: string;
  accessibleFloors: Prisma.JsonValue | null;
  accessibleRoomIds: Prisma.JsonValue | null;
  includedAmenities: Prisma.JsonValue | null;
  excludedAmenities: Prisma.JsonValue | null;
  availableDays: Prisma.JsonValue | null;
  minimumAdvanceBookingDays: number | null;
  blockedPackageIds: Prisma.JsonValue | null;
  enabled: boolean;
};
type DatabaseListingRoom = {
  id: string;
  propertyId: string;
  name: string;
  capacity: number;
  floor: string;
  description: string | null;
  photoUrls: Prisma.JsonValue | null;
  amenities: Prisma.JsonValue | null;
  active: boolean;
  displayOrder: number | null;
};
type DatabaseProperty = Prisma.PropertyGetPayload<{
  include: {
    images: true;
    amenities: { include: { amenity: true } };
    location: true;
    pricing: true;
  };
}>;
type DatabasePublicListingSummary = Prisma.PropertyGetPayload<{
  select: {
    id: true;
    slug: true;
    title: true;
    address: true;
    city: true;
    country: true;
    bookingType: true;
    pricePerNight: true;
    pricing: true;
    bedrooms: true;
    bathrooms: true;
    maxGuests: true;
    eventCapacity: true;
    sleepingCapacity: true;
    propertyType: true;
    rating: true;
    createdAt: true;
    images: { take: 5 };
    location: true;
    amenities: { select: { amenity: { select: { name: true } } } };
  };
}>;

function parseStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function parseNumberArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
}

function isPrismaJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonStringValue(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function jsonNumberValue(value: Prisma.JsonValue | undefined) {
  return typeof value === "number" ? value : Number(value);
}

function jsonBooleanValue(value: Prisma.JsonValue | undefined, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function parseSeasonalRates(value: Prisma.JsonValue | null | undefined): SeasonalRate[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isPrismaJsonObject)
    .filter((item) => {
      const type = jsonStringValue(item.type);
      return !type || type === "seasonal";
    })
    .map((item) => {
      const name = jsonStringValue(item.name).trim();

      return {
        id: jsonStringValue(item.id) || undefined,
        name: name || "Seasonal rate",
        startDate: jsonStringValue(item.startDate),
        endDate: jsonStringValue(item.endDate),
        weekdayRate: jsonNumberValue(item.weekdayRate),
        weekendRate: jsonNumberValue(item.weekendRate),
        holidayRate: jsonNumberValue(item.holidayRate),
      };
    })
    .filter((item) =>
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) &&
      item.endDate >= item.startDate &&
      Number.isFinite(item.weekdayRate) &&
      item.weekdayRate > 0,
    )
    .map((item) => ({
      ...item,
      weekendRate: Number.isFinite(item.weekendRate) && Number(item.weekendRate) > 0 ? Number(item.weekendRate) : undefined,
      holidayRate: Number.isFinite(item.holidayRate) && Number(item.holidayRate) > 0 ? Number(item.holidayRate) : undefined,
    }));
}

function parseRateAdjustments(value: Prisma.JsonValue | null | undefined): ListingRateAdjustment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isPrismaJsonObject)
    .map((item) => {
      const type = jsonStringValue(item.type);
      const name = jsonStringValue(item.name).trim();
      const weekdayRate = jsonNumberValue(item.weekdayRate);
      const weekendRate = jsonNumberValue(item.weekendRate);
      const discountPercent = jsonNumberValue(item.discountPercent);
      const discountAmount = jsonNumberValue(item.discountAmount);

      return {
        id: jsonStringValue(item.id),
        type,
        name: name || (type === "discount" ? "Calendar promo" : "Calendar rate"),
        startDate: jsonStringValue(item.startDate),
        endDate: jsonStringValue(item.endDate),
        active: jsonBooleanValue(item.active, true),
        weekdayRate: Number.isFinite(weekdayRate) && weekdayRate > 0 ? weekdayRate : undefined,
        weekendRate: Number.isFinite(weekendRate) && weekendRate > 0 ? weekendRate : undefined,
        discountPercent: Number.isFinite(discountPercent) && discountPercent > 0 ? discountPercent : undefined,
        discountAmount: Number.isFinite(discountAmount) && discountAmount > 0 ? discountAmount : undefined,
        createdAt: jsonStringValue(item.createdAt) || undefined,
      };
    })
    .filter((item) =>
      Boolean(item.id) &&
      (item.type === "monthly" || item.type === "custom" || item.type === "discount") &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) &&
      item.endDate >= item.startDate &&
      (
        item.type === "discount"
          ? Boolean(item.discountPercent || item.discountAmount)
          : Boolean(item.weekdayRate)
      ),
    )
    .map((item): ListingRateAdjustment => ({
      ...item,
      type: item.type as ListingRateAdjustment["type"],
    }));
}

function groupBookingPackages(packages: DatabaseBookingPackage[]) {
  return packages.reduce<Record<string, BookingPackage[]>>((groups, item) => {
    const bookingPackage: BookingPackage = {
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      status: item.status === "inactive" ? "inactive" : "active",
      displayOrder: item.displayOrder ?? 0,
      accessType: item.accessType,
      unit: item.unit === "day" ? "day" : "night",
      weekdayRate: item.weekdayRate,
      weekendRate: item.weekendRate,
      holidayRate: item.holidayRate ?? undefined,
      holidayDates: parseStringArray(item.holidayDates),
      seasonalRates: parseSeasonalRates(item.seasonalRates),
      includedGuests: item.includedGuests,
      maxGuests: item.maxGuests,
      sleepingCapacity: item.sleepingCapacity ?? undefined,
      durationHours: item.durationHours ?? undefined,
      additionalGuestFee: item.additionalGuestFee,
      extensionHourlyFee: item.extensionHourlyFee,
      checkInTime: item.checkInTime,
      checkOutTime: item.checkOutTime,
      accessibleFloors: parseStringArray(item.accessibleFloors),
      accessibleRoomIds: parseStringArray(item.accessibleRoomIds),
      includedAmenities: parseStringArray(item.includedAmenities),
      excludedAmenities: parseStringArray(item.excludedAmenities),
      availableDays: parseNumberArray(item.availableDays),
      minimumAdvanceBookingDays: item.minimumAdvanceBookingDays ?? 0,
      blockedPackageIds: parseStringArray(item.blockedPackageIds),
      enabled: item.enabled,
    };
    groups[item.propertyId] = [...(groups[item.propertyId] ?? []), bookingPackage];
    return groups;
  }, {});
}

function groupListingRooms(rooms: DatabaseListingRoom[]) {
  return rooms.reduce<Record<string, PropertyRoom[]>>((groups, item) => {
    const room: PropertyRoom = {
      id: item.id,
      name: item.name,
      capacity: item.capacity,
      floor: item.floor,
      description: item.description ?? undefined,
      photos: parseStringArray(item.photoUrls),
      amenities: parseStringArray(item.amenities),
      active: item.active,
    };
    groups[item.propertyId] = [...(groups[item.propertyId] ?? []), room];
    return groups;
  }, {});
}

function normalizeListingBookingType(value: string | null | undefined) {
  return value === "package" || value === "both" ? value : "stay";
}

function toProperty(property: DatabaseProperty, packagesByProperty: Record<string, BookingPackage[]>, roomsByProperty: Record<string, PropertyRoom[]> = {}): Property {
  return {
    id: property.id,
    hostId: property.hostId,
    slug: property.slug,
    title: property.title,
    description: property.description,
    address: property.address,
    city: property.city,
    country: property.country,
    virtualTourUrl: property.virtualTourUrl ?? undefined,
    listingVideoUrl: property.listingVideoUrl ?? undefined,
    bookingType: normalizeListingBookingType(property.bookingType),
    pricePerNight: property.pricePerNight,
    weekendPrice: property.pricing?.weekendPrice,
    holidayPrice: property.pricing?.holidayPrice ?? undefined,
    holidayDates: parseStringArray(property.pricing?.holidayDates),
    seasonalRates: parseSeasonalRates(property.pricing?.seasonalRates),
    rateAdjustments: parseRateAdjustments(property.pricing?.seasonalRates),
    cleaningFee: property.pricing?.cleaningFee,
    securityDeposit: property.pricing?.securityDeposit,
    currency: property.pricing?.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.maxGuests,
    eventCapacity: property.eventCapacity ?? undefined,
    sleepingCapacity: property.sleepingCapacity ?? undefined,
    propertyType: property.propertyType,
    privacyType: property.privacyType,
    status: property.status as Property["status"],
    rating: property.rating,
    amenities: property.amenities.map(({ amenity }) => amenity.name),
    rules: parseRules(property.rules),
    createdAt: property.createdAt.toISOString().slice(0, 10),
    images: property.images.map(toPropertyImage),
    rooms: roomsByProperty[property.id] ?? undefined,
    bookingPackages: packagesByProperty[property.id] ?? undefined,
    latitude: property.location?.latitude,
    longitude: property.location?.longitude,
    barangay: property.location?.barangay ?? undefined,
    province: property.location?.province ?? undefined,
    zipCode: property.location?.zipCode ?? undefined,
    preciseLocation: property.location?.preciseLocation,
  };
}

function toPublicListingSummary(property: DatabasePublicListingSummary, packagesByProperty: Record<string, BookingPackage[]> = {}): PublicListingSummary {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    address: property.address,
    city: property.city,
    country: property.country,
    bookingType: normalizeListingBookingType(property.bookingType),
    pricePerNight: property.pricePerNight,
    weekendPrice: property.pricing?.weekendPrice,
    holidayPrice: property.pricing?.holidayPrice ?? undefined,
    holidayDates: parseStringArray(property.pricing?.holidayDates),
    seasonalRates: parseSeasonalRates(property.pricing?.seasonalRates),
    rateAdjustments: parseRateAdjustments(property.pricing?.seasonalRates),
    ...(packagesByProperty[property.id]?.length ? { bookingPackages: packagesByProperty[property.id] } : {}),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.maxGuests,
    eventCapacity: property.eventCapacity ?? undefined,
    sleepingCapacity: property.sleepingCapacity ?? undefined,
    propertyType: property.propertyType,
    amenities: property.amenities.map((entry) => entry.amenity.name),
    rating: property.rating,
    createdAt: property.createdAt.toISOString().slice(0, 10),
    images: property.images.map(toPropertyImage),
    latitude: property.location?.latitude,
    longitude: property.location?.longitude,
    barangay: property.location?.barangay ?? undefined,
    province: property.location?.province ?? undefined,
    zipCode: property.location?.zipCode ?? undefined,
    preciseLocation: property.location?.preciseLocation,
  };
}

async function listBookingPackageRowsForProperties(propertyIds: string[]): Promise<DatabaseBookingPackage[]> {
  if (!propertyIds.length) return [];
  await ensureListingBookingPackageTable();
  return prisma.$queryRaw<DatabaseBookingPackage[]>`
    SELECT
      "id", "propertyId", "name", "description", "status", "displayOrder", "accessType", "unit",
      "weekdayRate", "weekendRate", "holidayRate", "includedGuests", "maxGuests", "sleepingCapacity",
      "durationHours", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime",
      "accessibleFloors", "accessibleRoomIds", "includedAmenities", "excludedAmenities", "availableDays",
      "minimumAdvanceBookingDays", "blockedPackageIds", "holidayDates", "seasonalRates", "enabled"
    FROM "ListingBookingPackage"
    WHERE "propertyId" IN (${Prisma.join(propertyIds)})
    ORDER BY "displayOrder" ASC, "name" ASC
  `;
}

async function listListingRoomRowsForProperties(propertyIds: string[]): Promise<DatabaseListingRoom[]> {
  if (!propertyIds.length) return [];
  await ensureListingRoomTable();
  return prisma.$queryRaw<DatabaseListingRoom[]>`
    SELECT
      "id", "propertyId", "name", "capacity", "floor", "description", "photoUrls", "amenities", "active", "displayOrder"
    FROM "ListingRoom"
    WHERE "propertyId" IN (${Prisma.join(propertyIds)})
    ORDER BY "displayOrder" ASC, "floor" ASC, "name" ASC
  `;
}

export async function listPropertiesFromDatabase(): Promise<Property[]> {
  await ensurePropertyAdvancedPricingColumns();
  await ensureListingBookingPackageTable();
  await ensureListingRoomTable();
  const properties = await prisma.property.findMany({
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!properties.length) return [];
  const propertyIds = properties.map((property) => property.id);
  const [packages, rooms] = await Promise.all([
    listBookingPackageRowsForProperties(propertyIds),
    listListingRoomRowsForProperties(propertyIds),
  ]);
  const packagesByProperty = groupBookingPackages(packages);
  const roomsByProperty = groupListingRooms(rooms);

  return properties.map((property) => toProperty(property, packagesByProperty, roomsByProperty));
}

export async function listPropertiesForHostFromDatabase(hostId: string): Promise<Property[]> {
  await ensurePropertyAdvancedPricingColumns();
  await ensureListingBookingPackageTable();
  await ensureListingRoomTable();
  const properties = await prisma.property.findMany({
    where: { hostId },
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!properties.length) return [];
  const propertyIds = properties.map((property) => property.id);
  const [packages, rooms] = await Promise.all([
    listBookingPackageRowsForProperties(propertyIds),
    listListingRoomRowsForProperties(propertyIds),
  ]);
  const packagesByProperty = groupBookingPackages(packages);
  const roomsByProperty = groupListingRooms(rooms);

  return properties.map((property) => toProperty(property, packagesByProperty, roomsByProperty));
}

export async function listPropertiesByStatusFromDatabase(status: Property["status"]): Promise<Property[]> {
  await ensurePropertyAdvancedPricingColumns();
  await ensureListingBookingPackageTable();
  await ensureListingRoomTable();
  const properties = await prisma.property.findMany({
    where: { status },
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const propertyIds = properties.map((property) => property.id);
  const [packages, rooms] = await Promise.all([
    listBookingPackageRowsForProperties(propertyIds),
    listListingRoomRowsForProperties(propertyIds),
  ]);
  const packagesByProperty = groupBookingPackages(packages);
  const roomsByProperty = groupListingRooms(rooms);

  return properties.map((property) => toProperty(property, packagesByProperty, roomsByProperty));
}

export async function listPublicListingSummariesFromDatabase(): Promise<PublicListingSummary[]> {
  await ensurePropertyAdvancedPricingColumns();
  await ensureListingBookingPackageTable();
  const properties = await prisma.property.findMany({
    where: { status: "approved" },
    select: {
      id: true,
      slug: true,
      title: true,
      address: true,
      city: true,
      country: true,
      bookingType: true,
      pricePerNight: true,
      pricing: true,
      bedrooms: true,
      bathrooms: true,
      maxGuests: true,
      eventCapacity: true,
      sleepingCapacity: true,
      propertyType: true,
      rating: true,
      createdAt: true,
      images: { take: 5 },
      location: true,
      amenities: { select: { amenity: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const packageRows = await listBookingPackageRowsForProperties(properties.map((property) => property.id));
  const packagesByProperty = groupBookingPackages(packageRows);

  return properties.map((property) => toPublicListingSummary(property, packagesByProperty));
}

export async function findPropertyByIdFromDatabase(id: string): Promise<Property | null> {
  await ensurePropertyAdvancedPricingColumns();
  await ensureListingBookingPackageTable();
  await ensureListingRoomTable();
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
  });
  if (!property) return null;

  const [packages, rooms] = await Promise.all([
    listBookingPackageRowsForProperties([id]),
    listListingRoomRowsForProperties([id]),
  ]);

  return toProperty(property, groupBookingPackages(packages), groupListingRooms(rooms));
}

function amenityIdForName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `amenity-${slug || randomUUID()}`;
}

async function ensureAmenitiesForProperty(db: Pick<Prisma.TransactionClient, "amenity">, amenities: string[]) {
  const names = Array.from(new Set(amenities.map((name) => name.trim()).filter(Boolean)));
  if (!names.length) return [];

  await db.amenity.createMany({
    data: names.map((name) => ({ id: amenityIdForName(name), name })),
    skipDuplicates: true,
  });

  const records = await db.amenity.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  const idByName = new Map(records.map((amenity) => [amenity.name, amenity.id]));
  return names.map((name) => idByName.get(name)).filter((id): id is string => Boolean(id));
}

function inputJsonArrayValue(value?: unknown[]) {
  if (!value?.length) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function pricingRulesJsonValue(property: Pick<Property, "seasonalRates" | "rateAdjustments">) {
  const rules = [
    ...(property.seasonalRates ?? []),
    ...(property.rateAdjustments ?? []),
  ];
  return inputJsonArrayValue(rules);
}

function propertyCreateData(property: Property, amenityIds: string[]) {
  const hasCoordinates = Number.isFinite(property.latitude) && Number.isFinite(property.longitude);

  return {
    id: property.id,
    hostId: property.hostId,
    slug: property.slug,
    title: property.title,
    description: property.description,
    address: property.address,
    city: property.city,
    country: property.country,
    virtualTourUrl: property.virtualTourUrl ?? null,
    listingVideoUrl: property.listingVideoUrl ?? null,
    bookingType: property.bookingType ?? "stay",
    pricePerNight: property.pricePerNight,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.maxGuests,
    eventCapacity: property.eventCapacity ?? null,
    sleepingCapacity: property.sleepingCapacity ?? null,
    propertyType: property.propertyType,
    privacyType: property.privacyType ?? "entire",
    status: property.status,
    rating: property.rating,
    rules: JSON.stringify(property.rules),
    createdAt: new Date(property.createdAt),
    ...(hasCoordinates ? {
      location: {
        create: {
          id: `location-${property.id}`,
          latitude: property.latitude!,
          longitude: property.longitude!,
          barangay: property.barangay,
          province: property.province,
          zipCode: property.zipCode,
          preciseLocation: property.preciseLocation ?? false,
        },
      },
    } : {}),
    ...(Number.isFinite(property.weekendPrice) ? {
      pricing: {
        create: {
          id: `pricing-${property.id}`,
          weekendPrice: property.weekendPrice!,
          holidayPrice: property.holidayPrice ?? null,
          holidayDates: inputJsonArrayValue(property.holidayDates),
          seasonalRates: pricingRulesJsonValue(property),
          cleaningFee: property.cleaningFee ?? 0,
          securityDeposit: property.securityDeposit ?? 0,
          currency: property.currency ?? "PHP",
        },
      },
    } : {}),
    images: {
      create: property.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        tone: image.tone,
        category: normalizeListingPhotoCategory(image.category),
      })),
    },
    amenities: {
      create: amenityIds.map((amenityId) => ({ amenityId })),
    },
  };
}

function jsonArrayValue(value?: unknown[]) {
  return JSON.stringify(value ?? []);
}

async function insertPropertyRooms(db: Pick<Prisma.TransactionClient, "$executeRaw" | "$executeRawUnsafe">, property: Pick<Property, "id" | "rooms">) {
  if (property.rooms?.length) {
    await ensureListingRoomTable(db);
    await Promise.all(
      property.rooms.map((room, index) => db.$executeRaw`
        INSERT INTO "ListingRoom" (
          "id", "propertyId", "name", "capacity", "floor", "description", "photoUrls", "amenities", "active", "displayOrder"
        )
        VALUES (
          ${room.id}, ${property.id}, ${room.name}, ${room.capacity}, ${room.floor}, ${room.description ?? null},
          ${jsonArrayValue(room.photos)}::jsonb, ${jsonArrayValue(room.amenities)}::jsonb, ${room.active}, ${index}
        )
      `),
    );
  }
}

async function insertPropertyBookingPackages(db: Pick<Prisma.TransactionClient, "$executeRaw" | "$executeRawUnsafe">, property: Pick<Property, "id" | "bookingPackages">) {
  if (property.bookingPackages?.length) {
    await ensureListingBookingPackageTable(db);
    await Promise.all(
      property.bookingPackages.map((bookingPackage, index) => db.$executeRaw`
        INSERT INTO "ListingBookingPackage" (
          "id", "propertyId", "name", "description", "status", "displayOrder", "accessType", "unit",
          "weekdayRate", "weekendRate", "holidayRate", "includedGuests", "maxGuests", "sleepingCapacity",
          "durationHours", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime",
          "accessibleFloors", "accessibleRoomIds", "includedAmenities", "excludedAmenities", "availableDays",
          "minimumAdvanceBookingDays", "blockedPackageIds", "holidayDates", "seasonalRates", "enabled"
        )
        VALUES (
          ${bookingPackage.id}, ${property.id}, ${bookingPackage.name}, ${bookingPackage.description ?? null},
          ${bookingPackage.status ?? "active"}, ${bookingPackage.displayOrder ?? index}, ${bookingPackage.accessType}, ${bookingPackage.unit},
          ${bookingPackage.weekdayRate}, ${bookingPackage.weekendRate}, ${bookingPackage.holidayRate ?? null},
          ${bookingPackage.includedGuests}, ${bookingPackage.maxGuests}, ${bookingPackage.sleepingCapacity ?? null},
          ${bookingPackage.durationHours ?? null}, ${bookingPackage.additionalGuestFee}, ${bookingPackage.extensionHourlyFee},
          ${bookingPackage.checkInTime}, ${bookingPackage.checkOutTime},
          ${jsonArrayValue(bookingPackage.accessibleFloors)}::jsonb, ${jsonArrayValue(bookingPackage.accessibleRoomIds)}::jsonb,
          ${jsonArrayValue(bookingPackage.includedAmenities)}::jsonb, ${jsonArrayValue(bookingPackage.excludedAmenities)}::jsonb,
          ${jsonArrayValue(bookingPackage.availableDays)}::jsonb, ${bookingPackage.minimumAdvanceBookingDays ?? 0},
          ${jsonArrayValue(bookingPackage.blockedPackageIds)}::jsonb, ${jsonArrayValue(bookingPackage.holidayDates)}::jsonb,
          ${jsonArrayValue(bookingPackage.seasonalRates)}::jsonb, ${bookingPackage.enabled}
        )
      `),
    );
  }
}

export async function createPropertyInDatabase(property: Property) {
  await prisma.$transaction(async (tx) => {
    await ensurePropertyAdvancedPricingColumns(tx);
    const amenityIds = await ensureAmenitiesForProperty(tx, property.amenities);
    await tx.property.create({ data: propertyCreateData(property, amenityIds) });
    await insertPropertyRooms(tx, property);
    await insertPropertyBookingPackages(tx, property);
  }, { maxWait: 10000, timeout: 15000 });
}

export async function upsertDraftPropertyInDatabase(property: Property) {
  if (property.status !== "draft") throw new Error("Only draft listings can be saved through this path.");

  await prisma.$transaction(async (tx) => {
    await ensurePropertyAdvancedPricingColumns(tx);
    await tx.property.deleteMany({ where: { id: property.id, hostId: property.hostId, status: "draft" } });
    const amenityIds = await ensureAmenitiesForProperty(tx, property.amenities);
    await tx.property.create({ data: propertyCreateData(property, amenityIds) });
    await insertPropertyRooms(tx, property);
    await insertPropertyBookingPackages(tx, property);
  }, { maxWait: 10000, timeout: 15000 });
}

export async function deleteDraftPropertyInDatabase(hostId: string, propertyId: string) {
  await prisma.property.deleteMany({ where: { id: propertyId, hostId, status: "draft" } });
}

export async function deletePropertyInDatabase(hostId: string, propertyId: string) {
  await prisma.$transaction(async (tx) => {
    const owned = await tx.property.findFirst({ where: { id: propertyId, hostId }, select: { id: true } });
    if (!owned) throw new Error("Listing not found.");

    const bookings = await tx.booking.findMany({
      where: { propertyId },
      select: { id: true, status: true, paymentStatus: true, checkOut: true },
    });
    if (bookings.some((booking) => bookingBlocksListingDelete(booking))) {
      throw new Error("This listing has active bookings and can't be deleted.");
    }

    // Preserve booking and payment history. Historical bookings keep their property
    // relationship, while the deleted status removes the listing from host/public views.
    if (bookings.length > 0) {
      await tx.property.update({ where: { id: propertyId }, data: { status: "deleted" } });
      return;
    }

    // Clear the non-financial relations that block deletion, then cascade the rest.
    await tx.review.deleteMany({ where: { propertyId } });
    await tx.wishlist.deleteMany({ where: { propertyId } });
    await tx.property.delete({ where: { id: propertyId } });
  });
}

type DatabasePayout = {
  id: string;
  hostId: string;
  bookingId: string | null;
  paymentId: string | null;
  amount: number;
  status: string;
  availableOn: Date;
  createdAt: Date;
};

function toPayout(row: DatabasePayout): Payout {
  return {
    id: row.id,
    hostId: row.hostId,
    bookingId: row.bookingId ?? undefined,
    paymentId: row.paymentId ?? undefined,
    amount: row.amount,
    status: row.status === "pending" ? "pending" : "paid",
    availableOn: row.availableOn.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPayoutInDatabase(payout: Payout) {
  await prisma.$executeRaw`
    INSERT INTO "Payout" (
      "id", "hostId", "bookingId", "paymentId", "amount", "status", "availableOn"
    )
    VALUES (
      ${payout.id}, ${payout.hostId}, ${payout.bookingId ?? null}, ${payout.paymentId ?? null},
      ${payout.amount}, ${payout.status}, ${new Date(payout.availableOn)}
    )
  `;
}

export async function getPayoutsForHostFromDatabase(hostId: string): Promise<Payout[]> {
  const rows = await prisma.$queryRaw<DatabasePayout[]>`
    SELECT "id", "hostId", "bookingId", "paymentId", "amount", "status", "availableOn", "createdAt"
    FROM "Payout"
    WHERE "hostId" = ${hostId}
    ORDER BY "createdAt" DESC
  `;
  return rows.map(toPayout);
}

export async function getAllPayoutsFromDatabase(): Promise<Payout[]> {
  const rows = await prisma.$queryRaw<DatabasePayout[]>`
    SELECT "id", "hostId", "bookingId", "paymentId", "amount", "status", "availableOn", "createdAt"
    FROM "Payout"
    ORDER BY "createdAt" DESC
  `;
  return rows.map(toPayout);
}

export async function updatePropertyStatusInDatabase(id: string, status: Property["status"]) {
  await prisma.property.update({ where: { id }, data: { status } });
}

export type PropertyDetailsUpdate = Pick<Property,
  "id" | "title" | "description" | "address" | "city" | "country" | "pricePerNight" | "weekendPrice" |
  "virtualTourUrl" | "listingVideoUrl" | "bookingType" | "holidayPrice" | "holidayDates" | "seasonalRates" | "rateAdjustments" | "cleaningFee" | "securityDeposit" | "currency" | "bedrooms" | "bathrooms" | "maxGuests" | "eventCapacity" | "sleepingCapacity" | "propertyType" | "privacyType" | "amenities" | "rules" | "images" | "rooms" | "bookingPackages"
>;

export async function updatePropertyDetailsInDatabase(property: PropertyDetailsUpdate) {
  await prisma.$transaction(async (tx) => {
    await ensurePropertyAdvancedPricingColumns(tx);
    const amenityIds = await ensureAmenitiesForProperty(tx, property.amenities);
    await tx.property.update({
      where: { id: property.id },
      data: {
        title: property.title,
        description: property.description,
        address: property.address,
        city: property.city,
        country: property.country,
        virtualTourUrl: property.virtualTourUrl ?? null,
        listingVideoUrl: property.listingVideoUrl ?? null,
        bookingType: property.bookingType ?? "stay",
        pricePerNight: property.pricePerNight,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        maxGuests: property.maxGuests,
        eventCapacity: property.eventCapacity ?? null,
        sleepingCapacity: property.sleepingCapacity ?? null,
        propertyType: property.propertyType,
        privacyType: property.privacyType ?? "entire",
        rules: JSON.stringify(property.rules),
        amenities: {
          deleteMany: {},
          create: amenityIds.map((amenityId) => ({ amenityId })),
        },
        images: {
          deleteMany: {},
          create: property.images.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            tone: image.tone,
            category: normalizeListingPhotoCategory(image.category),
          })),
        },
        pricing: {
          upsert: {
            create: {
              id: `pricing-${property.id}`,
              weekendPrice: property.weekendPrice ?? property.pricePerNight,
              holidayPrice: property.holidayPrice ?? null,
              holidayDates: inputJsonArrayValue(property.holidayDates),
              seasonalRates: pricingRulesJsonValue(property),
              cleaningFee: property.cleaningFee ?? 0,
              securityDeposit: property.securityDeposit ?? 0,
              currency: property.currency ?? "PHP",
            },
            update: {
              weekendPrice: property.weekendPrice ?? property.pricePerNight,
              holidayPrice: property.holidayPrice ?? null,
              holidayDates: inputJsonArrayValue(property.holidayDates),
              seasonalRates: pricingRulesJsonValue(property),
              cleaningFee: property.cleaningFee ?? 0,
              securityDeposit: property.securityDeposit ?? 0,
              currency: property.currency ?? "PHP",
            },
          },
        },
      },
    });
    await ensureListingRoomTable(tx);
    await tx.$executeRaw`DELETE FROM "ListingRoom" WHERE "propertyId" = ${property.id}`;
    await insertPropertyRooms(tx, property);
    await ensureListingBookingPackageTable(tx);
    await tx.$executeRaw`DELETE FROM "ListingBookingPackage" WHERE "propertyId" = ${property.id}`;
    await insertPropertyBookingPackages(tx, property);
  }, { maxWait: 10000, timeout: 15000 });
}

export async function updatePropertyPricingRulesInDatabase(property: Pick<Property,
  "id" | "pricePerNight" | "weekendPrice" | "holidayPrice" | "holidayDates" | "seasonalRates" | "rateAdjustments" | "cleaningFee" | "securityDeposit" | "currency"
>) {
  await prisma.$transaction(async (tx) => {
    await ensurePropertyAdvancedPricingColumns(tx);
    await tx.listingPricing.upsert({
      where: { propertyId: property.id },
      create: {
        id: `pricing-${property.id}`,
        propertyId: property.id,
        weekendPrice: property.weekendPrice ?? property.pricePerNight,
        holidayPrice: property.holidayPrice ?? null,
        holidayDates: inputJsonArrayValue(property.holidayDates),
        seasonalRates: pricingRulesJsonValue(property),
        cleaningFee: property.cleaningFee ?? 0,
        securityDeposit: property.securityDeposit ?? 0,
        currency: property.currency ?? "PHP",
      },
      update: {
        weekendPrice: property.weekendPrice ?? property.pricePerNight,
        holidayPrice: property.holidayPrice ?? null,
        holidayDates: inputJsonArrayValue(property.holidayDates),
        seasonalRates: pricingRulesJsonValue(property),
        cleaningFee: property.cleaningFee ?? 0,
        securityDeposit: property.securityDeposit ?? 0,
        currency: property.currency ?? "PHP",
      },
    });
  });
}

function toBooking(
  booking: Awaited<ReturnType<typeof prisma.booking.findMany>>[number],
  packageByBookingId: Map<string, { id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>,
): Booking {
  const selectedPackage = packageByBookingId.get(booking.id);
  return {
    bookingPackageId: selectedPackage?.bookingPackageId ?? undefined,
    bookingPackageName: selectedPackage?.bookingPackageName ?? undefined,
    bookingPackageUnit: selectedPackage?.bookingPackageUnit === "day" ? "day" : selectedPackage?.bookingPackageUnit === "night" ? "night" : undefined,
    id: booking.id,
    propertyId: booking.propertyId,
    guestId: booking.guestId,
    hostId: booking.hostId,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    status: booking.status as Booking["status"],
    paymentStatus: booking.paymentStatus as Booking["paymentStatus"],
    createdAt: booking.createdAt.toISOString().slice(0, 10),
  };
}

export async function listBookingsFromDatabase(): Promise<Booking[]> {
  await ensureBookingPackageColumns();
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
  const bookingPackages = await prisma.$queryRaw<Array<{ id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>>`
    SELECT "id", "bookingPackageId", "bookingPackageName", "bookingPackageUnit"
    FROM "Booking"
  `;
  const packageByBookingId = new Map(bookingPackages.map((booking) => [booking.id, booking]));
  return bookings.map((booking) => toBooking(booking, packageByBookingId));
}

export async function listBookingsForPropertyFromDatabase(propertyId: string): Promise<Booking[]> {
  await ensureBookingPackageColumns();
  const bookings = await prisma.booking.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
  const bookingPackages = await prisma.$queryRaw<Array<{ id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>>`
    SELECT "id", "bookingPackageId", "bookingPackageName", "bookingPackageUnit"
    FROM "Booking"
    WHERE "propertyId" = ${propertyId}
  `;
  const packageByBookingId = new Map(bookingPackages.map((booking) => [booking.id, booking]));
  return bookings.map((booking) => toBooking(booking, packageByBookingId));
}

export async function listBookingsForHostFromDatabase(hostId: string): Promise<Booking[]> {
  await ensureBookingPackageColumns();
  const bookings = await prisma.booking.findMany({
    where: { hostId },
    orderBy: [
      { checkIn: "asc" },
      { checkOut: "asc" },
      { createdAt: "desc" },
    ],
  });
  const bookingPackages = await prisma.$queryRaw<Array<{ id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>>`
    SELECT "id", "bookingPackageId", "bookingPackageName", "bookingPackageUnit"
    FROM "Booking"
    WHERE "hostId" = ${hostId}
  `;
  const packageByBookingId = new Map(bookingPackages.map((booking) => [booking.id, booking]));
  return bookings.map((booking) => toBooking(booking, packageByBookingId));
}

export async function listBookingsForGuestFromDatabase(guestId: string): Promise<Booking[]> {
  await ensureBookingPackageColumns();
  const bookings = await prisma.booking.findMany({
    where: { guestId },
    orderBy: { createdAt: "desc" },
  });
  const bookingPackages = await prisma.$queryRaw<Array<{ id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>>`
    SELECT "id", "bookingPackageId", "bookingPackageName", "bookingPackageUnit"
    FROM "Booking"
    WHERE "guestId" = ${guestId}
  `;
  const packageByBookingId = new Map(bookingPackages.map((booking) => [booking.id, booking]));
  return bookings.map((booking) => toBooking(booking, packageByBookingId));
}

type DatabaseAvailabilityBlock = {
  id: string;
  propertyId: string;
  date: Date;
  reason: string | null;
  note: string | null;
  bookingPackageId: string | null;
  bookingPackageName: string | null;
  createdAt: Date;
};

function toAvailabilityBlock(block: DatabaseAvailabilityBlock): AvailabilityBlock {
  return {
    id: block.id,
    propertyId: block.propertyId,
    date: block.date.toISOString().slice(0, 10),
    reason: (block.reason ?? "other") as AvailabilityBlock["reason"],
    note: block.note ?? undefined,
    bookingPackageId: block.bookingPackageId ?? undefined,
    bookingPackageName: block.bookingPackageName ?? undefined,
    createdAt: block.createdAt.toISOString(),
  };
}

export async function listAvailabilityBlocksFromDatabase(): Promise<AvailabilityBlock[]> {
  await ensureAvailabilityBlockBookingPackageColumns();
  const blocks = await prisma.$queryRaw<DatabaseAvailabilityBlock[]>`
    SELECT "id", "propertyId", "date", "reason", "note", "bookingPackageId", "bookingPackageName", "createdAt"
    FROM "AvailabilityBlock"
    WHERE "available" = false
    ORDER BY "date" ASC
  `;

  return blocks.map(toAvailabilityBlock);
}

export async function listAvailabilityBlocksForPropertyFromDatabase(propertyId: string): Promise<AvailabilityBlock[]> {
  await ensureAvailabilityBlockBookingPackageColumns();
  const blocks = await prisma.$queryRaw<DatabaseAvailabilityBlock[]>`
    SELECT "id", "propertyId", "date", "reason", "note", "bookingPackageId", "bookingPackageName", "createdAt"
    FROM "AvailabilityBlock"
    WHERE "propertyId" = ${propertyId} AND "available" = false
    ORDER BY "date" ASC
  `;

  return blocks.map(toAvailabilityBlock);
}

export async function createAvailabilityBlocksInDatabase(blocks: AvailabilityBlock[]) {
  await ensureAvailabilityBlockBookingPackageColumns();
  await prisma.$transaction(
    blocks.map((block) =>
      prisma.$executeRaw`
        INSERT INTO "AvailabilityBlock" (
          "id",
          "propertyId",
          "date",
          "available",
          "reason",
          "note",
          "bookingPackageId",
          "bookingPackageName",
          "createdAt"
        )
        VALUES (
          ${block.id},
          ${block.propertyId},
          ${new Date(block.date)},
          ${false},
          ${block.reason},
          ${block.note ?? null},
          ${block.bookingPackageId ?? null},
          ${block.bookingPackageName ?? null},
          ${new Date(block.createdAt)}
        )
        ON CONFLICT ("propertyId", "date") DO UPDATE SET
          "available" = false,
          "reason" = EXCLUDED."reason",
          "note" = EXCLUDED."note",
          "bookingPackageId" = EXCLUDED."bookingPackageId",
          "bookingPackageName" = EXCLUDED."bookingPackageName"
      `,
    ),
  );
}

export async function deleteAvailabilityBlockInDatabase(blockId: string) {
  await prisma.availabilityBlock.delete({ where: { id: blockId } });
}

function isBookingOverlapInvariantError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("BookingResourceLock_no_active_overlap_excl") ||
    message.includes("Booking_no_active_overlap_excl")
  );
}

export async function createBookingInDatabase(booking: Booking) {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  try {
    await prisma.$transaction(async (tx) => {
      await ensureBookingPackageColumns(tx);
      await ensureListingBookingPackageTable(tx);
      const packageRows = await tx.$queryRaw<DatabaseBookingPackage[]>`
        SELECT
          "id", "propertyId", "name", "description", "status", "displayOrder", "accessType", "unit",
          "weekdayRate", "weekendRate", "holidayRate", "includedGuests", "maxGuests", "sleepingCapacity",
          "durationHours", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime",
          "accessibleFloors", "accessibleRoomIds", "includedAmenities", "excludedAmenities", "availableDays",
          "minimumAdvanceBookingDays", "blockedPackageIds", "holidayDates", "seasonalRates", "enabled"
        FROM "ListingBookingPackage"
        WHERE "propertyId" = ${booking.propertyId}
      `;
      const bookingPackages = groupBookingPackages(packageRows)[booking.propertyId] ?? [];
      const overlappingBookings = await tx.$queryRaw<Array<{ id: string; bookingPackageId: string | null }>>`
        SELECT "id", "bookingPackageId"
        FROM "Booking"
        WHERE "propertyId" = ${booking.propertyId}
          AND "status" <> ${"cancelled"}
          AND NOT ("paymentStatus" IN (${"pending"}, ${"rejected"}) AND "checkIn" < ${today})
          AND "checkIn" < ${checkOut}
          AND "checkOut" > ${checkIn}
      `;
      const conflictingBooking = overlappingBookings.find((item) =>
        bookingBlocksRequestedPackage({ bookingPackageId: item.bookingPackageId ?? undefined }, booking.bookingPackageId, bookingPackages),
      );
      if (conflictingBooking) throw new Error("Those dates are no longer available.");

      const blockedDate = await tx.availabilityBlock.findFirst({
        where: {
          propertyId: booking.propertyId,
          available: false,
          date: { gte: checkIn, lt: checkOut },
        },
        select: { id: true },
      });
      if (blockedDate) throw new Error("Those dates are no longer available.");

      await tx.booking.create({
        data: {
          id: booking.id,
          propertyId: booking.propertyId,
          guestId: booking.guestId,
          hostId: booking.hostId,
          checkIn,
          checkOut,
          guests: booking.guests,
          totalPrice: booking.totalPrice,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          bookingPackageId: booking.bookingPackageId ?? null,
          bookingPackageName: booking.bookingPackageName ?? null,
          bookingPackageUnit: booking.bookingPackageUnit ?? null,
          createdAt: new Date(booking.createdAt),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isBookingOverlapInvariantError(error)) throw new Error("Those dates are no longer available.");
    throw error;
  }
}

export async function updateBookingPaymentInDatabase(bookingId: string, paymentStatus: Booking["paymentStatus"], transactionId: string) {
  const now = new Date();
  const confirmedAt = paymentStatus === "paid" ? now : null;

  await prisma.$transaction(async (tx) => {
    const duplicatePayment = await tx.payment.findFirst({
      where: {
        paymentMethod: "stripe",
        transactionId,
        NOT: { bookingId },
      },
      select: { id: true },
    });
    if (duplicatePayment) throw new Error(duplicatePaymentReferenceMessage);

    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: paymentStatus === "paid" ? { paymentStatus, status: "confirmed" } : { paymentStatus },
    });

    await tx.$executeRaw`
      INSERT INTO "Payment" (
        "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
        "transactionId", "submittedAt", "confirmedAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${`payment-${bookingId}`}, ${bookingId}, ${booking.guestId}, ${booking.hostId}, ${booking.totalPrice},
        ${"stripe"}, ${paymentStatus}, ${transactionId}, ${now}, ${confirmedAt}, ${now}, ${now}
      )
      ON CONFLICT ("bookingId") DO UPDATE SET
        "guestId" = EXCLUDED."guestId",
        "hostId" = EXCLUDED."hostId",
        "amount" = EXCLUDED."amount",
        "paymentMethod" = EXCLUDED."paymentMethod",
        "paymentStatus" = EXCLUDED."paymentStatus",
        "transactionId" = EXCLUDED."transactionId",
        "confirmedAt" = EXCLUDED."confirmedAt",
        "updatedAt" = EXCLUDED."updatedAt"
    `;

    if (paymentStatus === "paid") {
      await recordPlatformLedgerEntry(tx, {
        bookingId,
        paymentId: `payment-${bookingId}`,
        totalPrice: booking.totalPrice,
        source: "stripe",
        createdAt: now,
      });
      await insertAuditLog(tx, auditLogData({
        actorId: "system",
        actorRole: "system",
        action: "payment.approved",
        entityType: "payment",
        entityId: `payment-${bookingId}`,
        metadata: {
          bookingId,
          amount: booking.totalPrice,
          paymentMethod: "stripe",
          transactionId,
          source: "provider_webhook",
        },
        createdAt: now,
      }));
    }
  });
}

export async function beginStripeCheckoutAttemptInDatabase(booking: Booking) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({
      where: { bookingId: booking.id },
      select: { id: true, paymentMethod: true, paymentStatus: true, createdAt: true },
    });
    if (existingPayment?.paymentMethod === "stripe" && existingPayment.paymentStatus === "pending") {
      throw new Error("A payment checkout is already in progress for this booking.");
    }

    await tx.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        transactionId: `checkout-pending-${booking.id}`,
        rejectionReason: null,
        confirmedBy: null,
        submittedAt: null,
        confirmedAt: null,
        rejectedAt: null,
        updatedAt: now,
      },
      create: {
        id: `payment-${booking.id}`,
        bookingId: booking.id,
        guestId: booking.guestId,
        hostId: booking.hostId,
        amount: booking.totalPrice,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        transactionId: `checkout-pending-${booking.id}`,
        createdAt: now,
        updatedAt: now,
      },
    });
  });
}

export async function recordStripeCheckoutSessionInDatabase(bookingId: string, sessionId: string) {
  await prisma.payment.updateMany({
    where: {
      bookingId,
      paymentMethod: "stripe",
      paymentStatus: "pending",
    },
    data: {
      transactionId: sessionId.trim(),
      updatedAt: new Date(),
    },
  });
}

export async function clearStripeCheckoutAttemptInDatabase(bookingId: string) {
  await prisma.payment.deleteMany({
    where: {
      bookingId,
      paymentMethod: "stripe",
      paymentStatus: "pending",
    },
  });
}

export async function updateBookingStatusInDatabase(bookingId: string, status: Booking["status"]) {
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
}

export async function cancelBookingInDatabase({
  id,
  bookingId,
  propertyId,
  reason,
  status,
  actorId,
  actorRole,
  paymentStatus,
  policyOutcome,
  refundPercent,
  refundAmount,
  paidAmount,
}: {
  id: string;
  bookingId: string;
  propertyId: string;
  reason?: string;
  status: string;
  actorId?: string;
  actorRole?: AuditLog["actorRole"];
  paymentStatus?: Booking["paymentStatus"];
  policyOutcome?: string;
  refundPercent?: number;
  refundAmount?: number;
  paidAmount?: number;
}) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
    await tx.cancellation.upsert({
      where: { bookingId },
      update: { propertyId, reason: reason || null, status },
      create: {
        id,
        bookingId,
        propertyId,
        reason: reason || null,
        status,
      },
    });
    await insertAuditLog(tx, auditLogData({
      actorId: actorId ?? "system",
      actorRole: actorRole ?? "system",
      action: "booking.cancelled",
      entityType: "booking",
      entityId: bookingId,
      metadata: {
        propertyId,
        cancellationId: id,
        cancellationStatus: status,
        paymentStatus: paymentStatus ?? null,
        reason: reason ?? null,
        policyOutcome: policyOutcome ?? null,
        refundPercent: refundPercent ?? null,
        refundAmount: refundAmount ?? null,
        paidAmount: paidAmount ?? null,
      },
      createdAt: now,
    }));
  });
}

export async function listCancellationsFromDatabase(): Promise<Cancellation[]> {
  const cancellations = await prisma.cancellation.findMany({ orderBy: { createdAt: "desc" } });
  return cancellations.map((cancellation) => ({
    id: cancellation.id,
    bookingId: cancellation.bookingId,
    propertyId: cancellation.propertyId,
    reason: cancellation.reason ?? undefined,
    status: cancellation.status,
    createdAt: cancellation.createdAt.toISOString(),
  }));
}

export async function resolveCancellationReviewInDatabase({
  bookingId,
  resolution,
  adminId,
}: {
  bookingId: string;
  resolution: "refund" | "no_refund";
  adminId: string;
}) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const cancellation = await tx.cancellation.findUnique({
      where: { bookingId },
      select: { status: true },
    });
    if (!cancellation || cancellation.status !== "review") {
      throw new Error("No cancellation is waiting for admin review.");
    }

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true },
    });
    if (!booking) throw new Error("No cancellation is waiting for admin review.");

    const payment = await tx.payment.findUnique({
      where: { bookingId },
      select: { paymentStatus: true },
    });

    const nextBookingPaymentStatus = resolution === "refund"
      ? "refunded"
      : booking.paymentStatus === "submitted" ? "rejected" : booking.paymentStatus;

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled", paymentStatus: nextBookingPaymentStatus },
    });

    if (payment) {
      if (resolution === "refund") {
        await tx.payment.update({
          where: { bookingId },
          data: {
            paymentStatus: "refunded",
            rejectionReason: null,
            rejectedAt: null,
            updatedAt: now,
          },
        });
        await insertAuditLog(tx, auditLogData({
          actorId: adminId,
          actorRole: "admin",
          action: "payment.refunded",
          entityType: "payment",
          entityId: bookingId,
          metadata: { bookingId, previousPaymentStatus: payment.paymentStatus, cancellationResolution: resolution },
          createdAt: now,
        }));
      } else if (payment.paymentStatus === "submitted") {
        await tx.payment.update({
          where: { bookingId },
          data: {
            paymentStatus: "rejected",
            rejectionReason: "Cancellation closed without refund.",
            rejectedAt: now,
            confirmedAt: null,
            confirmedBy: null,
            updatedAt: now,
          },
        });
        await insertAuditLog(tx, auditLogData({
          actorId: adminId,
          actorRole: "admin",
          action: "payment.rejected",
          entityType: "payment",
          entityId: bookingId,
          metadata: {
            bookingId,
            previousPaymentStatus: payment.paymentStatus,
            reason: "Cancellation closed without refund.",
            cancellationResolution: resolution,
          },
          createdAt: now,
        }));
      }
    }

    await tx.cancellation.update({
      where: { bookingId },
      data: { status: resolution === "refund" ? "refunded" : "closed" },
    });
  });
}

export async function listReviewsFromDatabase(): Promise<Review[]> {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  return reviews.map((review) => ({
    id: review.id,
    propertyId: review.propertyId,
    guestId: review.guestId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString().slice(0, 10),
  }));
}

export async function listReviewsForPropertyFromDatabase(propertyId: string): Promise<Review[]> {
  const reviews = await prisma.review.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((review) => ({
    id: review.id,
    propertyId: review.propertyId,
    guestId: review.guestId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString().slice(0, 10),
  }));
}

export async function createReviewInDatabase(review: Review) {
  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        id: review.id,
        propertyId: review.propertyId,
        guestId: review.guestId,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.createdAt),
      },
    });

    const aggregate = await tx.review.aggregate({
      _avg: { rating: true },
      where: { propertyId: review.propertyId },
    });

    await tx.property.update({
      where: { id: review.propertyId },
      data: { rating: aggregate._avg.rating ?? review.rating },
    });
  });
}

type DatabasePayment = {
  id: string;
  bookingId: string;
  guestId: string | null;
  hostId: string | null;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  receiptImageUrl: string | null;
  notes: string | null;
  rejectionReason: string | null;
  confirmedBy: string | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export async function listPaymentsFromDatabase(): Promise<Payment[]> {
  await ensurePaymentColumns();
  const payments = await prisma.$queryRaw<DatabasePayment[]>`
    SELECT
      "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
      "transactionId", "receiptImageUrl", "notes", "rejectionReason", "confirmedBy", "submittedAt",
      "confirmedAt", "rejectedAt", "createdAt", "updatedAt"
    FROM "Payment"
    ORDER BY "createdAt" DESC
  `;
  return payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.bookingId,
    guestId: payment.guestId ?? undefined,
    hostId: payment.hostId ?? undefined,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.paymentStatus as Payment["paymentStatus"],
    transactionId: payment.transactionId,
    receiptImageUrl: payment.receiptImageUrl ?? undefined,
    notes: payment.notes ?? undefined,
    rejectionReason: payment.rejectionReason ?? undefined,
    confirmedBy: payment.confirmedBy ?? undefined,
    submittedAt: payment.submittedAt?.toISOString(),
    confirmedAt: payment.confirmedAt?.toISOString(),
    rejectedAt: payment.rejectedAt?.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt?.toISOString(),
  }));
}

export async function listPaymentsForHostFromDatabase(hostId: string): Promise<Payment[]> {
  await ensurePaymentColumns();
  const payments = await prisma.$queryRaw<DatabasePayment[]>`
    SELECT
      "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
      "transactionId", "receiptImageUrl", "notes", "rejectionReason", "confirmedBy", "submittedAt",
      "confirmedAt", "rejectedAt", "createdAt", "updatedAt"
    FROM "Payment"
    WHERE "hostId" = ${hostId}
    ORDER BY "createdAt" DESC
  `;
  return payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.bookingId,
    guestId: payment.guestId ?? undefined,
    hostId: payment.hostId ?? undefined,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.paymentStatus as Payment["paymentStatus"],
    transactionId: payment.transactionId,
    receiptImageUrl: payment.receiptImageUrl ?? undefined,
    notes: payment.notes ?? undefined,
    rejectionReason: payment.rejectionReason ?? undefined,
    confirmedBy: payment.confirmedBy ?? undefined,
    submittedAt: payment.submittedAt?.toISOString(),
    confirmedAt: payment.confirmedAt?.toISOString(),
    rejectedAt: payment.rejectedAt?.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt?.toISOString(),
  }));
}

export async function getAdminDashboardSummaryFromDatabase() {
  const [pendingListings, approvedListings, openBookings, grossBookingValue] = await Promise.all([
    prisma.property.count({ where: { status: "pending" } }),
    prisma.property.count({ where: { status: "approved" } }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.aggregate({ _sum: { totalPrice: true } }),
  ]);
  const grossBookingValueTotal = grossBookingValue._sum.totalPrice ?? 0;

  return {
    pendingListings,
    approvedListings,
    openBookings,
    grossBookingValue: grossBookingValueTotal,
    stayprimeEarningsValue: calculateStayprimeMarkupFromTotal(grossBookingValueTotal),
  };
}

type DatabasePlatformLedgerEntry = {
  id: string;
  bookingId: string;
  paymentId: string | null;
  amount: number;
  source: string;
  destination: string;
  status: string;
  createdAt: Date;
};

export async function listPlatformLedgerFromDatabase(): Promise<PlatformLedgerEntry[]> {
  await ensurePlatformLedgerTable();
  const entries = await prisma.$queryRaw<DatabasePlatformLedgerEntry[]>`
    SELECT "id", "bookingId", "paymentId", "amount", "source", "destination", "status", "createdAt"
    FROM "PlatformLedgerEntry"
    ORDER BY "createdAt" DESC
  `;

  return entries.map((entry) => ({
    id: entry.id,
    bookingId: entry.bookingId,
    paymentId: entry.paymentId ?? undefined,
    amount: entry.amount,
    source: entry.source as PlatformLedgerEntry["source"],
    destination: entry.destination as PlatformLedgerEntry["destination"],
    status: entry.status as PlatformLedgerEntry["status"],
    createdAt: entry.createdAt.toISOString(),
  }));
}

type DatabaseHostCustomerProfile = {
  id: string;
  hostId: string;
  guestId: string;
  classification: string;
  createdAt: Date;
  updatedAt: Date;
};

function toHostCustomerClassification(value: string): HostCustomerClassification {
  return value === "vip" ? "vip" : "ordinary";
}

function toHostCustomerProfile(profile: DatabaseHostCustomerProfile): HostCustomerProfile {
  return {
    id: profile.id,
    hostId: profile.hostId,
    guestId: profile.guestId,
    classification: toHostCustomerClassification(profile.classification),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function listHostCustomerProfilesFromDatabase(hostId?: string): Promise<HostCustomerProfile[]> {
  await ensureHostCustomerProfileTable();
  const profiles = hostId
    ? await prisma.$queryRaw<DatabaseHostCustomerProfile[]>`
        SELECT "id", "hostId", "guestId", "classification", "createdAt", "updatedAt"
        FROM "HostCustomerProfile"
        WHERE "hostId" = ${hostId}
        ORDER BY "updatedAt" DESC
      `
    : await prisma.$queryRaw<DatabaseHostCustomerProfile[]>`
        SELECT "id", "hostId", "guestId", "classification", "createdAt", "updatedAt"
        FROM "HostCustomerProfile"
        ORDER BY "updatedAt" DESC
      `;

  return profiles.map(toHostCustomerProfile);
}

export async function upsertHostCustomerProfileInDatabase({
  hostId,
  guestId,
  classification,
}: {
  hostId: string;
  guestId: string;
  classification: HostCustomerClassification;
}) {
  await ensureHostCustomerProfileTable();
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "HostCustomerProfile" (
      "id", "hostId", "guestId", "classification", "createdAt", "updatedAt"
    )
    VALUES (
      ${`${hostId}:${guestId}`}, ${hostId}, ${guestId}, ${classification}, ${now}, ${now}
    )
    ON CONFLICT ("hostId", "guestId") DO UPDATE SET
      "classification" = EXCLUDED."classification",
      "updatedAt" = EXCLUDED."updatedAt"
  `;
}

type DatabaseHostExpense = {
  id: string;
  hostId: string;
  expenseDate: Date;
  month: string;
  category: string;
  amount: number;
  vendor: string;
  description: string | null;
  receiptReference: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listHostExpensesFromDatabase(): Promise<HostExpense[]> {
  const expenses = await prisma.hostExpense.findMany({ orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }] });
  return expenses.map((expense: DatabaseHostExpense) => ({
    id: expense.id,
    hostId: expense.hostId,
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    month: expense.month,
    category: expense.category,
    amount: expense.amount,
    vendor: expense.vendor,
    description: expense.description ?? undefined,
    receiptReference: expense.receiptReference ?? undefined,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }));
}

export async function writeHostExpensesToDatabase(expenses: HostExpense[]) {
  await prisma.$transaction([
    prisma.hostExpense.deleteMany(),
    ...(expenses.length > 0
      ? [prisma.hostExpense.createMany({
        data: expenses.map((expense) => ({
          id: expense.id,
          hostId: expense.hostId,
          expenseDate: new Date(`${expense.expenseDate}T00:00:00.000Z`),
          month: expense.month,
          category: expense.category,
          amount: expense.amount,
          vendor: expense.vendor,
          description: expense.description ?? null,
          receiptReference: expense.receiptReference ?? null,
          createdAt: new Date(expense.createdAt),
          updatedAt: new Date(expense.updatedAt),
        })),
      })]
      : []),
  ]);
}

function hostExpenseData(expense: HostExpense) {
  return {
    id: expense.id,
    hostId: expense.hostId,
    expenseDate: new Date(`${expense.expenseDate}T00:00:00.000Z`),
    month: expense.month,
    category: expense.category,
    amount: expense.amount,
    vendor: expense.vendor,
    description: expense.description ?? null,
    receiptReference: expense.receiptReference ?? null,
    createdAt: new Date(expense.createdAt),
    updatedAt: new Date(expense.updatedAt),
  };
}

function hostExpenseUpdateData(expense: HostExpense) {
  return {
    hostId: expense.hostId,
    expenseDate: new Date(`${expense.expenseDate}T00:00:00.000Z`),
    month: expense.month,
    category: expense.category,
    amount: expense.amount,
    vendor: expense.vendor,
    description: expense.description ?? null,
    receiptReference: expense.receiptReference ?? null,
    updatedAt: new Date(expense.updatedAt),
  };
}

export async function createHostExpensesInDatabase(expenses: HostExpense[]) {
  if (expenses.length === 0) return;
  await prisma.hostExpense.createMany({
    data: expenses.map(hostExpenseData),
  });
}

export async function updateHostExpenseInDatabase(expense: HostExpense) {
  await prisma.hostExpense.update({
    data: hostExpenseUpdateData(expense),
    where: { id: expense.id },
  });
}

export async function deleteHostExpenseFromDatabase(expenseId: string) {
  await prisma.hostExpense.delete({ where: { id: expenseId } });
}

type DatabaseHostMonthlyReport = {
  id: string;
  hostId: string;
  month: string;
  reportDate: Date | null;
  salesAmount: number;
  expensesAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listHostMonthlyReportsFromDatabase(): Promise<HostMonthlyReport[]> {
  const reports = await prisma.hostMonthlyReport.findMany({ orderBy: { month: "desc" } });
  return reports.map((report: DatabaseHostMonthlyReport) => ({
    id: report.id,
    hostId: report.hostId,
    month: report.month,
    reportDate: (report.reportDate ?? new Date(`${report.month}-01T00:00:00.000Z`)).toISOString().slice(0, 10),
    salesAmount: report.salesAmount,
    expensesAmount: report.expensesAmount,
    notes: report.notes ?? undefined,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  }));
}

export async function writeHostMonthlyReportsToDatabase(reports: HostMonthlyReport[]) {
  await prisma.$transaction([
    prisma.hostMonthlyReport.deleteMany(),
    ...(reports.length > 0
      ? [prisma.hostMonthlyReport.createMany({
        data: reports.map((report) => ({
          id: report.id,
          hostId: report.hostId,
          month: report.month,
          reportDate: new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00.000Z`),
          salesAmount: report.salesAmount,
          expensesAmount: report.expensesAmount,
          notes: report.notes ?? null,
          createdAt: new Date(report.createdAt),
          updatedAt: new Date(report.updatedAt),
        })),
      })]
      : []),
  ]);
}

export async function upsertHostMonthlyReportInDatabase(report: HostMonthlyReport) {
  await prisma.hostMonthlyReport.upsert({
    where: { id: report.id },
    update: {
      hostId: report.hostId,
      month: report.month,
      reportDate: new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00.000Z`),
      salesAmount: report.salesAmount,
      expensesAmount: report.expensesAmount,
      notes: report.notes ?? null,
      updatedAt: new Date(report.updatedAt),
    },
    create: {
      id: report.id,
      hostId: report.hostId,
      month: report.month,
      reportDate: new Date(`${report.reportDate ?? `${report.month}-01`}T00:00:00.000Z`),
      salesAmount: report.salesAmount,
      expensesAmount: report.expensesAmount,
      notes: report.notes ?? null,
      createdAt: new Date(report.createdAt),
      updatedAt: new Date(report.updatedAt),
    },
  });
}

export async function deleteHostMonthlyReportFromDatabase(reportId: string) {
  await prisma.hostMonthlyReport.delete({ where: { id: reportId } });
}

export async function recordManualPaymentInDatabase(
  booking: Booking,
  payment: Pick<Payment, "amount" | "paymentMethod" | "transactionId" | "receiptImageUrl" | "notes">,
) {
  const now = new Date();
  const nextBookingStatus = booking.paymentStatus === "partially_paid" ? "confirmed" : "pending";
  await prisma.$transaction(async (tx) => {
    const duplicatePayment = await tx.payment.findFirst({
      where: {
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        NOT: { bookingId: booking.id },
      },
      select: { id: true },
    });
    if (duplicatePayment) throw new Error(duplicatePaymentReferenceMessage);

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: nextBookingStatus, paymentStatus: "submitted" },
    });
    await tx.$executeRaw`
      INSERT INTO "Payment" (
        "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
        "transactionId", "receiptImageUrl", "notes", "submittedAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${`payment-${booking.id}`}, ${booking.id}, ${booking.guestId}, ${booking.hostId}, ${payment.amount},
        ${payment.paymentMethod}, ${"submitted"}, ${payment.transactionId}, ${payment.receiptImageUrl ?? null}, ${payment.notes ?? null}, ${now}, ${now}, ${now}
      )
      ON CONFLICT ("bookingId") DO UPDATE SET
        "guestId" = EXCLUDED."guestId",
        "hostId" = EXCLUDED."hostId",
        "amount" = EXCLUDED."amount",
        "paymentMethod" = EXCLUDED."paymentMethod",
        "paymentStatus" = EXCLUDED."paymentStatus",
        "transactionId" = EXCLUDED."transactionId",
        "receiptImageUrl" = EXCLUDED."receiptImageUrl",
        "notes" = EXCLUDED."notes",
        "rejectionReason" = NULL,
        "confirmedBy" = NULL,
        "submittedAt" = EXCLUDED."submittedAt",
        "confirmedAt" = NULL,
        "rejectedAt" = NULL,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  });
}

export async function confirmManualPaymentInDatabase(bookingId: string, confirmedBy: string, confirmedByRole: "admin" | "host" = "admin") {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { bookingId },
      select: { paymentMethod: true, transactionId: true, amount: true },
    });
    if (!payment) throw new Error("No submitted payment is waiting for verification.");

    const duplicatePayment = await tx.payment.findFirst({
      where: {
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        NOT: { bookingId },
      },
      select: { id: true },
    });
    if (duplicatePayment) throw new Error(duplicatePaymentReferenceMessage);

    const bookingRow = await tx.booking.findUnique({ where: { id: bookingId }, select: { totalPrice: true } });
    const totalPrice = bookingRow?.totalPrice ?? payment.amount;
    const isPartial = payment.amount < totalPrice;
    const confirmedStatus = isPartial ? "partially_paid" : "paid";

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", paymentStatus: confirmedStatus },
    });
    await tx.$executeRaw`
      UPDATE "Payment"
      SET
        "paymentStatus" = ${confirmedStatus},
        "confirmedBy" = ${confirmedBy},
        "confirmedAt" = ${now},
        "rejectionReason" = NULL,
        "rejectedAt" = NULL,
        "updatedAt" = ${now}
      WHERE "bookingId" = ${bookingId}
    `;
    // Only bank the platform's cut once the booking is paid in full.
    if (!isPartial) {
      await recordPlatformLedgerEntry(tx, {
        bookingId,
        paymentId: `payment-${bookingId}`,
        totalPrice,
        source: "manual_payment",
        createdAt: now,
      });
    }
    await insertAuditLog(tx, auditLogData({
      actorId: confirmedBy,
      actorRole: confirmedByRole,
      action: "payment.approved",
      entityType: "payment",
      entityId: bookingId,
      metadata: { bookingId, paymentMethod: payment.paymentMethod, transactionId: payment.transactionId },
      createdAt: now,
    }));
  });
}

export async function markManualPaymentFullyPaidInDatabase(bookingId: string, confirmedBy: string, confirmedByRole: "admin" | "host" = "host") {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { bookingId },
      select: {
        id: true,
        paymentMethod: true,
        transactionId: true,
        amount: true,
        paymentStatus: true,
        notes: true,
      },
    });
    if (!payment || payment.paymentStatus !== "partially_paid") {
      throw new Error("No partially paid booking is waiting for balance collection.");
    }

    const bookingRow = await tx.booking.findUnique({ where: { id: bookingId }, select: { totalPrice: true } });
    const totalPrice = bookingRow?.totalPrice ?? payment.amount;
    const remainingBalance = Math.max(totalPrice - payment.amount, 0);
    const cashBalanceNote = "Remaining balance paid in cash at check-in.";
    const nextNotes = payment.notes
      ? `${payment.notes}\n${cashBalanceNote}`
      : cashBalanceNote;

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", paymentStatus: "paid" },
    });
    await tx.$executeRaw`
      UPDATE "Payment"
      SET
        "amount" = ${totalPrice},
        "paymentStatus" = ${"paid"},
        "confirmedBy" = ${confirmedBy},
        "confirmedAt" = ${now},
        "notes" = ${nextNotes},
        "rejectionReason" = NULL,
        "rejectedAt" = NULL,
        "updatedAt" = ${now}
      WHERE "bookingId" = ${bookingId}
    `;
    await recordPlatformLedgerEntry(tx, {
      bookingId,
      paymentId: payment.id,
      totalPrice,
      source: "manual_payment",
      createdAt: now,
    });
    await insertAuditLog(tx, auditLogData({
      actorId: confirmedBy,
      actorRole: confirmedByRole,
      action: "payment.approved",
      entityType: "payment",
      entityId: payment.id,
      metadata: {
        bookingId,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        previousPaymentStatus: payment.paymentStatus,
        previousAmount: payment.amount,
        amount: totalPrice,
        remainingBalance,
        source: "cash_balance",
      },
      createdAt: now,
    }));
  });
}

export async function rejectManualPaymentInDatabase(
  bookingId: string,
  rejectionReason: string,
  rejectedBy = "system",
  rejectedByRole: "admin" | "host" | "system" = rejectedBy === "system" ? "system" : "admin",
) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { bookingId },
      select: { paymentMethod: true, transactionId: true },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "pending", paymentStatus: "rejected" },
    });
    await tx.$executeRaw`
      UPDATE "Payment"
      SET
        "paymentStatus" = ${"rejected"},
        "rejectionReason" = ${rejectionReason},
        "rejectedAt" = ${now},
        "confirmedBy" = NULL,
        "confirmedAt" = NULL,
        "updatedAt" = ${now}
      WHERE "bookingId" = ${bookingId}
    `;
    await insertAuditLog(tx, auditLogData({
      actorId: rejectedBy,
      actorRole: rejectedByRole,
      action: "payment.rejected",
      entityType: "payment",
      entityId: bookingId,
      metadata: {
        bookingId,
        reason: rejectionReason,
        paymentMethod: payment?.paymentMethod ?? null,
        transactionId: payment?.transactionId ?? null,
      },
      createdAt: now,
    }));
  });
}

type DatabaseMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId: string | null;
  propertyId: string | null;
  message: string;
  createdAt: Date;
};

export async function listMessagesFromDatabase(): Promise<Message[]> {
  const messages = await prisma.$queryRaw<DatabaseMessage[]>`
    SELECT id, "senderId", "receiverId", "bookingId", "propertyId", message, "createdAt"
    FROM "Message"
    ORDER BY "createdAt" ASC
  `;

  return messages.map((message) => ({
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    bookingId: message.bookingId ?? undefined,
    propertyId: message.propertyId ?? undefined,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function createMessageInDatabase(message: Message) {
  await prisma.$executeRaw`
    INSERT INTO "Message" ("id", "senderId", "receiverId", "bookingId", "propertyId", "message", "createdAt")
    VALUES (
      ${message.id},
      ${message.senderId},
      ${message.receiverId},
      ${message.bookingId ?? null},
      ${message.propertyId ?? null},
      ${message.message},
      ${new Date(message.createdAt)}
    )
  `;
}

function tokenTypeSupportsMetadata(type: AuthToken["type"]) {
  return type === "email_change" || type === "email_verification";
}

function encodeMetadataTokenType(type: AuthToken["type"], metadata: Record<string, unknown> | undefined) {
  const payload = Buffer.from(JSON.stringify(metadata ?? {}), "utf8").toString("base64url");
  return `${type}:${payload}`;
}

function encodeAuthTokenType(token: AuthToken) {
  return tokenTypeSupportsMetadata(token.type) && token.metadata ? encodeMetadataTokenType(token.type, token.metadata) : token.type;
}

function decodeStoredAuthTokenType(value: string): Pick<AuthToken, "type" | "metadata"> | null {
  const metadataPrefix = value.startsWith("email_change:")
    ? "email_change"
    : value.startsWith("email_verification:")
      ? "email_verification"
      : null;

  if (metadataPrefix) {
    try {
      const rawPayload = value.slice(`${metadataPrefix}:`.length);
      const metadata = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
      return {
        type: metadataPrefix,
        metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : undefined,
      };
    } catch {
      return null;
    }
  }

  if (value === "email_verification" || value === "password_reset" || value === "admin_mfa" || value === "account_deletion") return { type: value };
  return null;
}

function authTokenTypeWhere(type: AuthToken["type"]): Prisma.AuthTokenWhereInput {
  if (tokenTypeSupportsMetadata(type)) {
    return { OR: [{ type }, { type: { startsWith: `${type}:` } }] };
  }

  return { type };
}

export async function createAuthTokenInDatabase(token: AuthToken) {
  await prisma.authToken.create({
    data: {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      type: encodeAuthTokenType(token),
      expiresAt: new Date(token.expiresAt),
      createdAt: new Date(token.createdAt),
    },
  });
}

export async function createSessionInDatabase(session: AuthSession) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`
    INSERT INTO "AuthSession" (
      "id", "userId", "sessionHash", "expiresAt", "createdAt",
      "userAgent", "ipAddress", "lastSeenAt", "mfaVerifiedAt", "mfaRole"
    )
    VALUES (
      ${session.id}, ${session.userId}, ${session.sessionHash}, ${new Date(session.expiresAt)}, ${new Date(session.createdAt)},
      ${session.userAgent ?? null}, ${session.ipAddress ?? null}, ${session.lastSeenAt ? new Date(session.lastSeenAt) : null},
      ${session.mfaVerifiedAt ? new Date(session.mfaVerifiedAt) : null}, ${session.mfaRole ?? null}
    )
  `;
}

type DatabaseAuthSession = {
  id: string;
  userId: string;
  sessionHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: Date | null;
  mfaVerifiedAt: Date | null;
  mfaRole: string | null;
};

function toAuthSession(session: DatabaseAuthSession): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    sessionHash: session.sessionHash,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    userAgent: session.userAgent ?? undefined,
    ipAddress: session.ipAddress ?? undefined,
    lastSeenAt: session.lastSeenAt?.toISOString(),
    mfaVerifiedAt: session.mfaVerifiedAt?.toISOString(),
    mfaRole: session.mfaRole === "admin" || session.mfaRole === "host" || session.mfaRole === "guest" ? session.mfaRole : undefined,
  };
}

export async function findSessionFromDatabase(sessionHash: string) {
  await ensureAuthSessionTable();
  const session = await prisma.$queryRaw<DatabaseAuthSession[]>`
    SELECT
      "id", "userId", "sessionHash", "expiresAt", "createdAt",
      "userAgent", "ipAddress", "lastSeenAt", "mfaVerifiedAt", "mfaRole"
    FROM "AuthSession"
    WHERE "sessionHash" = ${sessionHash}
    LIMIT 1
  `;
  const found = session[0];
  if (!found) return null;
  if (found.expiresAt <= new Date()) {
    await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "id" = ${found.id}`;
    return null;
  }
  await prisma.$executeRaw`UPDATE "AuthSession" SET "lastSeenAt" = ${new Date()} WHERE "id" = ${found.id}`;
  return toAuthSession(found);
}

export async function listSessionsForUserFromDatabase(userId: string) {
  await ensureAuthSessionTable();
  const sessions = await prisma.$queryRaw<DatabaseAuthSession[]>`
    SELECT
      "id", "userId", "sessionHash", "expiresAt", "createdAt",
      "userAgent", "ipAddress", "lastSeenAt", "mfaVerifiedAt", "mfaRole"
    FROM "AuthSession"
    WHERE "userId" = ${userId} AND "expiresAt" > ${new Date()}
    ORDER BY "createdAt" DESC
  `;
  return sessions.map(toAuthSession);
}

export async function deleteSessionFromDatabase(sessionHash: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "sessionHash" = ${sessionHash}`;
}

export async function deleteSessionByIdForUserFromDatabase(userId: string, sessionId: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${userId} AND "id" = ${sessionId}`;
}

export async function deleteSessionsForUserFromDatabase(userId: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${userId}`;
}

export async function deleteSessionsForUserExceptFromDatabase(userId: string, sessionHash: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${userId} AND "sessionHash" <> ${sessionHash}`;
}

type DatabasePasskey = {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  name: string;
  transports: Prisma.JsonValue | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

function toPasskey(passkey: DatabasePasskey): Passkey {
  return {
    id: passkey.id,
    userId: passkey.userId,
    credentialId: passkey.credentialId,
    publicKey: passkey.publicKey,
    counter: passkey.counter,
    name: passkey.name,
    transports: Array.isArray(passkey.transports) ? passkey.transports.filter((item): item is string => typeof item === "string") : undefined,
    deviceType: passkey.deviceType === "multiDevice" ? "multiDevice" : "singleDevice",
    backedUp: passkey.backedUp,
    createdAt: passkey.createdAt.toISOString(),
    lastUsedAt: passkey.lastUsedAt?.toISOString(),
  };
}

export async function listPasskeysForUserFromDatabase(userId: string) {
  await ensurePasskeyTable();
  const passkeys = await prisma.$queryRaw<DatabasePasskey[]>`
    SELECT
      "id", "userId", "credentialId", "publicKey", "counter", "name",
      "transports", "deviceType", "backedUp", "createdAt", "lastUsedAt"
    FROM "Passkey"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
  `;
  return passkeys.map(toPasskey);
}

export async function findPasskeyByCredentialIdFromDatabase(credentialId: string) {
  await ensurePasskeyTable();
  const passkeys = await prisma.$queryRaw<DatabasePasskey[]>`
    SELECT
      "id", "userId", "credentialId", "publicKey", "counter", "name",
      "transports", "deviceType", "backedUp", "createdAt", "lastUsedAt"
    FROM "Passkey"
    WHERE "credentialId" = ${credentialId}
    LIMIT 1
  `;
  return passkeys[0] ? toPasskey(passkeys[0]) : null;
}

export async function createPasskeyInDatabase(passkey: Passkey) {
  await ensurePasskeyTable();
  await prisma.$executeRaw`
    INSERT INTO "Passkey" (
      "id", "userId", "credentialId", "publicKey", "counter", "name",
      "transports", "deviceType", "backedUp", "createdAt", "lastUsedAt"
    )
    VALUES (
      ${passkey.id}, ${passkey.userId}, ${passkey.credentialId}, ${passkey.publicKey}, ${passkey.counter}, ${passkey.name},
      ${JSON.stringify(passkey.transports ?? [])}::jsonb, ${passkey.deviceType}, ${passkey.backedUp},
      ${new Date(passkey.createdAt)}, ${passkey.lastUsedAt ? new Date(passkey.lastUsedAt) : null}
    )
  `;
}

export async function deletePasskeyForUserInDatabase(userId: string, passkeyId: string) {
  await ensurePasskeyTable();
  await prisma.$executeRaw`DELETE FROM "Passkey" WHERE "userId" = ${userId} AND "id" = ${passkeyId}`;
}

export async function updatePasskeyUsageInDatabase(credentialId: string, counter: number, deviceType: Passkey["deviceType"], backedUp: boolean) {
  await ensurePasskeyTable();
  await prisma.$executeRaw`
    UPDATE "Passkey"
    SET "counter" = ${counter}, "deviceType" = ${deviceType}, "backedUp" = ${backedUp}, "lastUsedAt" = ${new Date()}
    WHERE "credentialId" = ${credentialId}
  `;
}

function toAuthToken(token: { id: string; userId: string; tokenHash: string; type: string; expiresAt: Date; createdAt: Date }): AuthToken | null {
  const decoded = decodeStoredAuthTokenType(token.type);
  if (!decoded) return null;

  return {
    id: token.id,
    userId: token.userId,
    tokenHash: token.tokenHash,
    type: decoded.type,
    metadata: decoded.metadata,
    expiresAt: token.expiresAt.toISOString(),
    createdAt: token.createdAt.toISOString(),
  };
}

export async function deleteAuthTokensForUserInDatabase(userId: string, type: AuthToken["type"]) {
  await prisma.authToken.deleteMany({ where: { userId, ...authTokenTypeWhere(type) } });
}

export async function findAuthTokenFromDatabase(tokenHash: string, type: AuthToken["type"]) {
  const token = await prisma.authToken.findFirst({
    where: { tokenHash, ...authTokenTypeWhere(type) },
  });
  if (!token) return null;
  if (token.expiresAt < new Date()) {
    await prisma.authToken.delete({ where: { id: token.id } });
    return null;
  }
  const decoded = toAuthToken(token);
  return decoded?.type === type ? decoded : null;
}

export async function consumeAuthTokenFromDatabase(tokenHash: string, type: AuthToken["type"]) {
  const token = await prisma.authToken.findFirst({
    where: { tokenHash, ...authTokenTypeWhere(type) },
  });
  if (!token) return null;
  if (token.expiresAt < new Date()) {
    await prisma.authToken.delete({ where: { id: token.id } });
    return null;
  }
  await prisma.authToken.delete({ where: { id: token.id } });
  const decoded = toAuthToken(token);
  return decoded?.type === type ? decoded : null;
}

export async function consumeEmailVerificationTokenByCodeHashInDatabase(userId: string, codeHash: string) {
  const tokens = await prisma.authToken.findMany({
    where: { userId, ...authTokenTypeWhere("email_verification") },
    orderBy: { createdAt: "desc" },
  });

  for (const token of tokens) {
    if (token.expiresAt < new Date()) {
      await prisma.authToken.delete({ where: { id: token.id } });
      continue;
    }

    const decoded = toAuthToken(token);
    if (decoded?.type === "email_verification" && decoded.metadata?.codeHash === codeHash) {
      await prisma.authToken.delete({ where: { id: token.id } });
      return decoded;
    }
  }

  return null;
}

export async function markUserEmailVerifiedInDatabase(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export async function completeUserEmailChangeInDatabase(userId: string, oldEmail: string, newEmail: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || user.email.toLowerCase() !== oldEmail.toLowerCase()) return false;

  const existingUser = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: userId } },
    select: { id: true },
  });
  if (existingUser) return false;

  const settings = await prisma.accountSettings.findUnique({
    where: { userId },
    select: { personalInfo: true },
  });
  const personalInfo = settings?.personalInfo && typeof settings.personalInfo === "object" && !Array.isArray(settings.personalInfo)
    ? { ...settings.personalInfo as Record<string, unknown>, email: newEmail }
    : undefined;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, emailVerifiedAt: new Date() },
    }),
    ...(personalInfo
      ? [prisma.accountSettings.update({
        where: { userId },
        data: { personalInfo: personalInfo as Prisma.InputJsonValue },
      })]
      : []),
  ]);
  return true;
}

export async function updateUserPasswordInDatabase(userId: string, passwordHash: string) {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "password" = ${passwordHash}, "passwordChangedAt" = ${new Date()}
    WHERE "id" = ${userId}
  `;
}

export async function updateUserRoleInDatabase(userId: string, role: User["role"]) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role } }),
    prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${userId}`,
  ]);
}

export async function updateUserAvatarInDatabase(userId: string, avatar: string) {
  await prisma.user.update({ where: { id: userId }, data: { avatar } });
}
