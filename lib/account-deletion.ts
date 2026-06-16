import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import { readStoredBookings } from "@/lib/booking-store";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { usesPrismaPersistence } from "@/lib/repositories";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUserById } from "@/lib/users";
import type { Booking, User, WishlistItem } from "@/lib/types";

type StoredAccountSettings = {
  userId: string;
  privacy?: unknown;
};

function anonymizedEmail(userId: string) {
  return `deleted-${userId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}@deleted.stayprimeph.local`;
}

function isActiveBooking(booking: Pick<Booking, "status" | "paymentStatus" | "checkOut">) {
  const today = new Date().toISOString().slice(0, 10);
  const activeStatus = booking.status === "pending" || booking.status === "confirmed";
  return (activeStatus && booking.checkOut >= today) || booking.paymentStatus === "submitted";
}

function deletionRequestedAtFromPrivacy(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const requestedAt = (value as { deletionRequestedAt?: unknown }).deletionRequestedAt;
  return typeof requestedAt === "string" ? requestedAt : null;
}

export async function getDeletionRequestMap() {
  const requests = new Map<string, string>();

  if (usesPrismaPersistence()) {
    const records = await prisma.accountSettings.findMany({
      select: { userId: true, privacy: true },
    });
    for (const record of records) {
      const requestedAt = deletionRequestedAtFromPrivacy(record.privacy);
      if (requestedAt) requests.set(record.userId, requestedAt);
    }
    return requests;
  }

  const records = await readJsonStore<StoredAccountSettings>("account-settings.json");
  for (const record of records) {
    const requestedAt = deletionRequestedAtFromPrivacy(record.privacy);
    if (requestedAt) requests.set(record.userId, requestedAt);
  }
  return requests;
}

async function anonymizeUserInJsonStore(target: User) {
  const bookings = await readStoredBookings();
  if (bookings.some((booking) => (booking.guestId === target.id || booking.hostId === target.id) && isActiveBooking(booking))) {
    throw new Error("This account still has an active booking or submitted payment. Resolve those first.");
  }

  const [users, properties, tokens, accountSettings, wishlists] = await Promise.all([
    readStoredUsers(),
    readStoredProperties(),
    readStoredAuthTokens(),
    readJsonStore<StoredAccountSettings>("account-settings.json"),
    readJsonStore<WishlistItem>("wishlists.json"),
  ]);

  await writeStoredUsers(users.map((user) => user.id === target.id ? {
    ...user,
    name: "Deleted account",
    email: anonymizedEmail(user.id),
    avatar: "",
    phone: "",
    passwordHash: undefined,
    emailVerifiedAt: undefined,
  } : user));
  await writeStoredProperties(properties.map((property) => property.hostId === target.id ? { ...property, status: "rejected" } : property));
  await writeStoredAuthTokens(tokens.filter((token) => token.userId !== target.id));
  await writeJsonStore("account-settings.json", accountSettings.filter((record) => record.userId !== target.id));
  await writeJsonStore("wishlists.json", wishlists.filter((item) => item.userId !== target.id));
}

async function anonymizeUserInDatabase(target: User, adminId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.$transaction(async (tx) => {
    const blocker = await tx.booking.findFirst({
      where: {
        AND: [
          { OR: [{ guestId: target.id }, { hostId: target.id }] },
          {
            OR: [
              { status: { in: ["pending", "confirmed"] }, checkOut: { gte: today } },
              { paymentStatus: "submitted" },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (blocker) throw new Error("This account still has an active booking or submitted payment. Resolve those first.");

    await tx.authToken.deleteMany({ where: { userId: target.id } });
    await tx.wishlist.deleteMany({ where: { userId: target.id } });
    await tx.accountSettings.deleteMany({ where: { userId: target.id } });
    await tx.property.updateMany({ where: { hostId: target.id }, data: { status: "rejected" } });
    await tx.user.update({
      where: { id: target.id },
      data: {
        name: "Deleted account",
        email: anonymizedEmail(target.id),
        avatar: null,
        phone: null,
        password: null,
        emailVerifiedAt: null,
      },
    });
    await tx.adminLog.create({
      data: {
        id: randomUUID(),
        adminId,
        action: "account_anonymized",
        entityType: "User",
        entityId: target.id,
      },
    });
  });
}

export async function processAccountDeletion({ adminId, targetUserId }: { adminId: string; targetUserId: string }) {
  if (adminId === targetUserId) throw new Error("Admins cannot delete their own account from this screen.");

  const target = usesPrismaPersistence()
    ? await getUserById(targetUserId)
    : (await readStoredUsers()).find((user) => user.id === targetUserId);
  if (!target) throw new Error("Account not found.");
  if (target.role === "admin") throw new Error("Admin accounts cannot be deleted from this screen.");
  if (target.email.endsWith("@deleted.stayprimeph.local")) throw new Error("This account has already been anonymized.");

  if (usesPrismaPersistence()) {
    await anonymizeUserInDatabase(target, adminId);
  } else {
    await anonymizeUserInJsonStore(target);
  }
}
