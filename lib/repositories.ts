import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import type { AuthToken, AvailabilityBlock, Booking, Message, Payment, PlatformLedgerEntry, Property, PropertyImage, Review, User } from "@/lib/types";

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

async function ensurePlatformLedgerTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma) {
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

export async function listUsersFromDatabase(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
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

export async function listPropertiesFromDatabase(): Promise<Property[]> {
  const properties = await prisma.property.findMany({
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      location: true,
      pricing: true,
    },
    orderBy: { createdAt: "desc" },
  });

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
}

export async function updatePropertyStatusInDatabase(id: string, status: Property["status"]) {
  await prisma.property.update({ where: { id }, data: { status } });
}

export async function listBookingsFromDatabase(): Promise<Booking[]> {
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
  return bookings.map((booking) => ({
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateBookingPaymentInDatabase(bookingId: string, paymentStatus: Booking["paymentStatus"], transactionId: string) {
  const now = new Date();
  const confirmedAt = paymentStatus === "paid" ? now : null;

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus } });

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
    }
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
}: {
  id: string;
  bookingId: string;
  propertyId: string;
  reason?: string;
  status: string;
}) {
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } }),
    prisma.cancellation.upsert({
      where: { bookingId },
      update: { reason: reason || null, status },
      create: {
        id,
        bookingId,
        propertyId,
        reason: reason || null,
        status,
      },
    }),
  ]);
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

export async function recordManualPaymentInDatabase(
  booking: Booking,
  payment: Pick<Payment, "amount" | "paymentMethod" | "transactionId" | "notes">,
) {
  const now = new Date();
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "pending", paymentStatus: "submitted" },
    }),
    prisma.$executeRaw`
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
    `,
  ]);
}

export async function confirmManualPaymentInDatabase(bookingId: string, confirmedBy: string) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
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
  });
}

export async function rejectManualPaymentInDatabase(bookingId: string, rejectionReason: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "pending", paymentStatus: "rejected" },
    }),
    prisma.$executeRaw`
      UPDATE "Payment"
      SET
        "paymentStatus" = ${"rejected"},
        "rejectionReason" = ${rejectionReason},
        "rejectedAt" = ${now},
        "confirmedBy" = NULL,
        "confirmedAt" = NULL,
        "updatedAt" = ${now}
      WHERE "bookingId" = ${bookingId}
    `,
  ]);
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

export async function createAuthTokenInDatabase(token: AuthToken) {
  await prisma.authToken.create({
    data: {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      type: token.type,
      expiresAt: new Date(token.expiresAt),
      createdAt: new Date(token.createdAt),
    },
  });
}

export async function consumeAuthTokenFromDatabase(tokenHash: string, type: AuthToken["type"]) {
  const token = await prisma.authToken.findFirst({ where: { tokenHash, type } });
  if (!token || token.expiresAt < new Date()) return null;
  await prisma.authToken.delete({ where: { id: token.id } });
  return {
    id: token.id,
    userId: token.userId,
    tokenHash: token.tokenHash,
    type: token.type as AuthToken["type"],
    expiresAt: token.expiresAt.toISOString(),
    createdAt: token.createdAt.toISOString(),
  };
}

export async function markUserEmailVerifiedInDatabase(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export async function updateUserPasswordInDatabase(userId: string, passwordHash: string) {
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
}

export async function updateUserRoleInDatabase(userId: string, role: User["role"]) {
  await prisma.user.update({ where: { id: userId }, data: { role } });
}
