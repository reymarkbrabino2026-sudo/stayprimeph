import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { duplicatePaymentReferenceMessage } from "@/lib/payment-references";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import type { AuditLog, AuditLogAction, AuthSession, AuthToken, AvailabilityBlock, Booking, BookingPackage, Cancellation, HostExpense, HostMonthlyReport, Message, Payment, PlatformLedgerEntry, Property, PropertyImage, Review, User } from "@/lib/types";

function toPropertyImage(image: { id: string; propertyId: string; imageUrl: string; tone: string | null }): PropertyImage {
  return {
    id: image.id,
    propertyId: image.propertyId,
    imageUrl: image.imageUrl,
    tone: image.tone ?? "from-rose-100 via-orange-50 to-stone-100",
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

let platformLedgerTableReady: Promise<void> | null = null;
let listingBookingPackageTableReady: Promise<void> | null = null;
let bookingPackageColumnsReady: Promise<void> | null = null;
let authSessionTableReady: Promise<void> | null = null;

function cacheGlobalEnsure(db: unknown, cached: Promise<void> | null, setCached: (promise: Promise<void> | null) => void, ensure: () => Promise<void>) {
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
        "accessType" TEXT NOT NULL,
        "unit" TEXT NOT NULL,
        "weekdayRate" INTEGER NOT NULL,
        "weekendRate" INTEGER NOT NULL,
        "holidayRate" INTEGER,
        "includedGuests" INTEGER NOT NULL,
        "maxGuests" INTEGER NOT NULL,
        "additionalGuestFee" INTEGER NOT NULL,
        "extensionHourlyFee" INTEGER NOT NULL,
        "checkInTime" TEXT NOT NULL,
        "checkOutTime" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "ListingBookingPackage_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ListingBookingPackage_propertyId_idx" ON "ListingBookingPackage"("propertyId")`);
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
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_sessionHash_key" ON "AuthSession"("sessionHash")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt")`);
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

export async function listUsersFromDatabase(): Promise<User[]> {
  const users = await prisma.$queryRaw<DatabaseUser[]>`
    SELECT
      "id", "name", "email", "password", "role", "avatar", "phone",
      "emailVerifiedAt", "passwordChangedAt", "createdAt"
    FROM "User"
    ORDER BY "createdAt" DESC
  `;
  return users.map((user) => ({
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
  }));
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

type DatabaseBookingPackage = BookingPackage & { propertyId: string };

function groupBookingPackages(packages: DatabaseBookingPackage[]) {
  return packages.reduce<Record<string, BookingPackage[]>>((groups, item) => {
    const { propertyId: _propertyId, ...bookingPackage } = item;
    groups[_propertyId] = [...(groups[_propertyId] ?? []), bookingPackage];
    return groups;
  }, {});
}

export async function listPropertiesFromDatabase(): Promise<Property[]> {
  await ensureListingBookingPackageTable();
  const properties = await prisma.property.findMany({
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const packages = await prisma.$queryRaw<DatabaseBookingPackage[]>`
    SELECT
      "id", "propertyId", "name", "accessType", "unit", "weekdayRate", "weekendRate", "holidayRate",
      "includedGuests", "maxGuests", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime", "enabled"
    FROM "ListingBookingPackage"
    ORDER BY "name" ASC
  `;
  const packagesByProperty = groupBookingPackages(packages);

  return properties.map((property) => ({
    id: property.id,
    hostId: property.hostId,
    slug: property.slug,
    title: property.title,
    description: property.description,
    address: property.address,
    city: property.city,
    country: property.country,
    pricePerNight: property.pricePerNight,
    weekendPrice: property.pricing?.weekendPrice,
    cleaningFee: property.pricing?.cleaningFee,
    securityDeposit: property.pricing?.securityDeposit,
    currency: property.pricing?.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.maxGuests,
    propertyType: property.propertyType,
    status: property.status as Property["status"],
    rating: property.rating,
    amenities: property.amenities.map(({ amenity }) => amenity.name),
    rules: parseRules(property.rules),
    createdAt: property.createdAt.toISOString().slice(0, 10),
    images: property.images.map(toPropertyImage),
    bookingPackages: packagesByProperty[property.id] ?? undefined,
    latitude: property.location?.latitude,
    longitude: property.location?.longitude,
    barangay: property.location?.barangay ?? undefined,
    province: property.location?.province ?? undefined,
    zipCode: property.location?.zipCode ?? undefined,
    preciseLocation: property.location?.preciseLocation,
  }));
}

export async function createPropertyInDatabase(property: Property) {
  const hasCoordinates = Number.isFinite(property.latitude) && Number.isFinite(property.longitude);

  await prisma.property.create({
    data: {
      id: property.id,
      hostId: property.hostId,
      slug: property.slug,
      title: property.title,
      description: property.description,
      address: property.address,
      city: property.city,
      country: property.country,
      pricePerNight: property.pricePerNight,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      propertyType: property.propertyType,
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
        })),
      },
      amenities: {
        create: await Promise.all(property.amenities.map(async (name) => {
          const amenity = await prisma.amenity.upsert({
            where: { name },
            update: {},
            create: { id: `amenity-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name },
          });
          return { amenityId: amenity.id };
        })),
      },
    },
  });

  if (property.bookingPackages?.length) {
    await ensureListingBookingPackageTable();
    await prisma.$transaction(
      property.bookingPackages.map((bookingPackage) => prisma.$executeRaw`
        INSERT INTO "ListingBookingPackage" (
          "id", "propertyId", "name", "accessType", "unit", "weekdayRate", "weekendRate", "holidayRate",
          "includedGuests", "maxGuests", "additionalGuestFee", "extensionHourlyFee", "checkInTime", "checkOutTime", "enabled"
        )
        VALUES (
          ${bookingPackage.id}, ${property.id}, ${bookingPackage.name}, ${bookingPackage.accessType}, ${bookingPackage.unit},
          ${bookingPackage.weekdayRate}, ${bookingPackage.weekendRate}, ${bookingPackage.holidayRate ?? null},
          ${bookingPackage.includedGuests}, ${bookingPackage.maxGuests}, ${bookingPackage.additionalGuestFee},
          ${bookingPackage.extensionHourlyFee}, ${bookingPackage.checkInTime}, ${bookingPackage.checkOutTime}, ${bookingPackage.enabled}
        )
      `),
    );
  }
}

export async function updatePropertyStatusInDatabase(id: string, status: Property["status"]) {
  await prisma.property.update({ where: { id }, data: { status } });
}

export async function listBookingsFromDatabase(): Promise<Booking[]> {
  await ensureBookingPackageColumns();
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
  const bookingPackages = await prisma.$queryRaw<Array<{ id: string; bookingPackageId: string | null; bookingPackageName: string | null; bookingPackageUnit: string | null }>>`
    SELECT "id", "bookingPackageId", "bookingPackageName", "bookingPackageUnit"
    FROM "Booking"
  `;
  const packageByBookingId = new Map(bookingPackages.map((booking) => [booking.id, booking]));
  return bookings.map((booking) => ({
    ...(() => {
      const selectedPackage = packageByBookingId.get(booking.id);
      return {
        bookingPackageId: selectedPackage?.bookingPackageId ?? undefined,
        bookingPackageName: selectedPackage?.bookingPackageName ?? undefined,
        bookingPackageUnit: selectedPackage?.bookingPackageUnit === "day" ? "day" as const : selectedPackage?.bookingPackageUnit === "night" ? "night" as const : undefined,
      };
    })(),
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
  }));
}

export async function listAvailabilityBlocksFromDatabase(): Promise<AvailabilityBlock[]> {
  const blocks = await prisma.availabilityBlock.findMany({
    where: { available: false },
    orderBy: { date: "asc" },
  });

  return blocks.map((block) => ({
    id: block.id,
    propertyId: block.propertyId,
    date: block.date.toISOString().slice(0, 10),
    reason: (block.reason ?? "other") as AvailabilityBlock["reason"],
    note: block.note ?? undefined,
    createdAt: block.createdAt.toISOString(),
  }));
}

export async function createAvailabilityBlocksInDatabase(blocks: AvailabilityBlock[]) {
  await prisma.$transaction(
    blocks.map((block) =>
      prisma.availabilityBlock.upsert({
        where: { propertyId_date: { propertyId: block.propertyId, date: new Date(block.date) } },
        update: {
          available: false,
          reason: block.reason,
          note: block.note ?? null,
        },
        create: {
          id: block.id,
          propertyId: block.propertyId,
          date: new Date(block.date),
          available: false,
          reason: block.reason,
          note: block.note ?? null,
          createdAt: new Date(block.createdAt),
        },
      }),
    ),
  );
}

export async function deleteAvailabilityBlockInDatabase(blockId: string) {
  await prisma.availabilityBlock.delete({ where: { id: blockId } });
}

export async function createBookingInDatabase(booking: Booking) {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  await prisma.$transaction(async (tx) => {
    await ensureBookingPackageColumns(tx);
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        propertyId: booking.propertyId,
        status: { not: "cancelled" },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    });
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
        createdAt: new Date(booking.createdAt),
      },
    });
    if (booking.bookingPackageId) {
      await tx.$executeRaw`
        UPDATE "Booking"
        SET
          "bookingPackageId" = ${booking.bookingPackageId},
          "bookingPackageName" = ${booking.bookingPackageName ?? null},
          "bookingPackageUnit" = ${booking.bookingPackageUnit ?? null}
        WHERE "id" = ${booking.id}
      `;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
}: {
  id: string;
  bookingId: string;
  propertyId: string;
  reason?: string;
  status: string;
  actorId?: string;
  actorRole?: AuditLog["actorRole"];
}) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
    await tx.cancellation.upsert({
      where: { bookingId },
      update: { reason: reason || null, status },
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
      metadata: { propertyId, cancellationId: id, cancellationStatus: status, reason: reason ?? null },
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
  const payments = await prisma.$queryRaw<DatabasePayment[]>`
    SELECT
      "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
      "transactionId", "notes", "rejectionReason", "confirmedBy", "submittedAt",
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
  payment: Pick<Payment, "amount" | "paymentMethod" | "transactionId" | "notes">,
) {
  const now = new Date();
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
      data: { status: "pending", paymentStatus: "submitted" },
    });
    await tx.$executeRaw`
      INSERT INTO "Payment" (
        "id", "bookingId", "guestId", "hostId", "amount", "paymentMethod", "paymentStatus",
        "transactionId", "notes", "submittedAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${`payment-${booking.id}`}, ${booking.id}, ${booking.guestId}, ${booking.hostId}, ${payment.amount},
        ${payment.paymentMethod}, ${"submitted"}, ${payment.transactionId}, ${payment.notes ?? null}, ${now}, ${now}, ${now}
      )
      ON CONFLICT ("bookingId") DO UPDATE SET
        "guestId" = EXCLUDED."guestId",
        "hostId" = EXCLUDED."hostId",
        "amount" = EXCLUDED."amount",
        "paymentMethod" = EXCLUDED."paymentMethod",
        "paymentStatus" = EXCLUDED."paymentStatus",
        "transactionId" = EXCLUDED."transactionId",
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

export async function confirmManualPaymentInDatabase(bookingId: string, confirmedBy: string) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { bookingId },
      select: { paymentMethod: true, transactionId: true },
    });
    if (!payment) throw new Error("No submitted payment is waiting for platform verification.");

    const duplicatePayment = await tx.payment.findFirst({
      where: {
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        NOT: { bookingId },
      },
      select: { id: true },
    });
    if (duplicatePayment) throw new Error(duplicatePaymentReferenceMessage);

    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", paymentStatus: "paid" },
    });
    await tx.$executeRaw`
      UPDATE "Payment"
      SET
        "paymentStatus" = ${"paid"},
        "confirmedBy" = ${confirmedBy},
        "confirmedAt" = ${now},
        "rejectionReason" = NULL,
        "rejectedAt" = NULL,
        "updatedAt" = ${now}
      WHERE "bookingId" = ${bookingId}
    `;
    await recordPlatformLedgerEntry(tx, {
      bookingId,
      paymentId: `payment-${bookingId}`,
      totalPrice: booking.totalPrice,
      source: "manual_payment",
      createdAt: now,
    });
    await insertAuditLog(tx, auditLogData({
      actorId: confirmedBy,
      actorRole: "admin",
      action: "payment.approved",
      entityType: "payment",
      entityId: bookingId,
      metadata: { bookingId, paymentMethod: payment.paymentMethod, transactionId: payment.transactionId },
      createdAt: now,
    }));
  });
}

export async function rejectManualPaymentInDatabase(bookingId: string, rejectionReason: string, rejectedBy = "system") {
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
      actorRole: rejectedBy === "system" ? "system" : "admin",
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

function encodeEmailChangeTokenType(metadata: Record<string, unknown> | undefined) {
  const payload = Buffer.from(JSON.stringify(metadata ?? {}), "utf8").toString("base64url");
  return `email_change:${payload}`;
}

function decodeStoredAuthTokenType(value: string): Pick<AuthToken, "type" | "metadata"> | null {
  if (value.startsWith("email_change:")) {
    try {
      const rawPayload = value.slice("email_change:".length);
      const metadata = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
      return {
        type: "email_change",
        metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : undefined,
      };
    } catch {
      return null;
    }
  }

  if (value === "email_verification" || value === "password_reset" || value === "admin_mfa" || value === "account_deletion") return { type: value };
  return null;
}

export async function createAuthTokenInDatabase(token: AuthToken) {
  await prisma.authToken.create({
    data: {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      type: token.type === "email_change" ? encodeEmailChangeTokenType(token.metadata) : token.type,
      expiresAt: new Date(token.expiresAt),
      createdAt: new Date(token.createdAt),
    },
  });
}

export async function createSessionInDatabase(session: AuthSession) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`
    INSERT INTO "AuthSession" ("id", "userId", "sessionHash", "expiresAt", "createdAt")
    VALUES (${session.id}, ${session.userId}, ${session.sessionHash}, ${new Date(session.expiresAt)}, ${new Date(session.createdAt)})
  `;
}

type DatabaseAuthSession = {
  id: string;
  userId: string;
  sessionHash: string;
  expiresAt: Date;
  createdAt: Date;
};

function toAuthSession(session: DatabaseAuthSession): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    sessionHash: session.sessionHash,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

export async function findSessionFromDatabase(sessionHash: string) {
  await ensureAuthSessionTable();
  const session = await prisma.$queryRaw<DatabaseAuthSession[]>`
    SELECT "id", "userId", "sessionHash", "expiresAt", "createdAt"
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
  return toAuthSession(found);
}

export async function deleteSessionFromDatabase(sessionHash: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "sessionHash" = ${sessionHash}`;
}

export async function deleteSessionsForUserFromDatabase(userId: string) {
  await ensureAuthSessionTable();
  await prisma.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${userId}`;
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
  if (type === "email_change") {
    await prisma.authToken.deleteMany({ where: { userId, type: { startsWith: "email_change:" } } });
    return;
  }

  await prisma.authToken.deleteMany({ where: { userId, type } });
}

export async function findAuthTokenFromDatabase(tokenHash: string, type: AuthToken["type"]) {
  const token = await prisma.authToken.findFirst({
    where: type === "email_change" ? { tokenHash, type: { startsWith: "email_change:" } } : { tokenHash, type },
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
    where: type === "email_change" ? { tokenHash, type: { startsWith: "email_change:" } } : { tokenHash, type },
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
