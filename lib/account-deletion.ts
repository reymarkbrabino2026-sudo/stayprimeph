import "server-only";

import { randomUUID } from "node:crypto";
import { getAccountSettings, savePrivacySettings } from "@/lib/account-settings";
import { appendAuditLog } from "@/lib/audit-logs";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/db";
import { sendAccountDeletionVerificationEmail } from "@/lib/email";
import { readJsonStore, writeJsonStore } from "@/lib/json-store";
import { readStoredAuthTokens, writeStoredAuthTokens } from "@/lib/auth-token-store";
import { readStoredBookings } from "@/lib/booking-store";
import { readStoredProperties, writeStoredProperties } from "@/lib/property-store";
import { usesPrismaPersistence } from "@/lib/repositories";
import { readStoredSessions, writeStoredSessions } from "@/lib/session-store";
import { readStoredUsers, writeStoredUsers } from "@/lib/user-store";
import { getUserById } from "@/lib/users";
import type { Booking, User, WishlistItem } from "@/lib/types";

type StoredAccountSettings = {
  userId: string;
  privacy?: unknown;
};

export type DeletionRequest = {
  requestedAt: string;
  verifiedAt: string | null;
};

export type DeletionRequestSlaStatus = "awaiting_verification" | "due" | "overdue";

export type DeletionRequestWorkflow = DeletionRequest & {
  dueAt: string | null;
  daysRemaining: number | null;
  status: DeletionRequestSlaStatus;
};

export const accountDeletionSlaDays = 30;

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

function deletionVerifiedAtFromPrivacy(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const verifiedAt = (value as { deletionVerifiedAt?: unknown }).deletionVerifiedAt;
  return typeof verifiedAt === "string" ? verifiedAt : null;
}

function deletionRequestFromPrivacy(value: unknown): DeletionRequest | null {
  const requestedAt = deletionRequestedAtFromPrivacy(value);
  if (!requestedAt) return null;
  return {
    requestedAt,
    verifiedAt: deletionVerifiedAtFromPrivacy(value),
  };
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function deletionRequestWorkflow(request: DeletionRequest, now = new Date()): DeletionRequestWorkflow {
  if (!request.verifiedAt) {
    return {
      ...request,
      dueAt: null,
      daysRemaining: null,
      status: "awaiting_verification",
    };
  }

  const dueAt = addDays(request.verifiedAt, accountDeletionSlaDays);
  if (!dueAt) {
    return {
      ...request,
      dueAt: null,
      daysRemaining: null,
      status: "due",
    };
  }

  const remainingMs = new Date(dueAt).getTime() - now.getTime();
  const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return {
    ...request,
    dueAt,
    daysRemaining,
    status: daysRemaining < 0 ? "overdue" : "due",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function getDeletionRequestMap() {
  const requests = new Map<string, DeletionRequest>();

  if (usesPrismaPersistence()) {
    const records = await prisma.accountSettings.findMany({
      select: { userId: true, privacy: true },
    });
    for (const record of records) {
      const request = deletionRequestFromPrivacy(record.privacy);
      if (request) requests.set(record.userId, request);
    }
    return requests;
  }

  const records = await readJsonStore<StoredAccountSettings>("account-settings.json");
  for (const record of records) {
    const request = deletionRequestFromPrivacy(record.privacy);
    if (request) requests.set(record.userId, request);
  }
  return requests;
}

async function writeDeletionPrivacyState(userId: string, patch: { requestedAt?: string; verifiedAt?: string | null }) {
  if (usesPrismaPersistence()) {
    const record = await prisma.accountSettings.findUnique({
      where: { userId },
      select: { privacy: true },
    });
    const currentPrivacy = isRecord(record?.privacy) ? record.privacy : {};
    const privacy = {
      ...currentPrivacy,
      ...(patch.requestedAt ? { deletionRequestedAt: patch.requestedAt } : {}),
      deletionVerifiedAt: patch.verifiedAt ?? null,
    };
    await prisma.accountSettings.update({
      where: { userId },
      data: { privacy },
    });
    return privacy;
  }

  const records = await readJsonStore<StoredAccountSettings>("account-settings.json");
  await writeJsonStore("account-settings.json", records.map((record) => {
    if (record.userId !== userId) return record;
    const currentPrivacy = isRecord(record.privacy) ? record.privacy : {};
    return {
      ...record,
      privacy: {
        ...currentPrivacy,
        ...(patch.requestedAt ? { deletionRequestedAt: patch.requestedAt } : {}),
        deletionVerifiedAt: patch.verifiedAt ?? null,
      },
    };
  }));
}

async function requireVerifiedDeletionRequest(userId: string) {
  const requests = await getDeletionRequestMap();
  const request = requests.get(userId);
  if (!request?.requestedAt) throw new Error("This account has not requested deletion.");
  if (!request.verifiedAt) throw new Error("The account owner must verify the deletion request by email before anonymization.");
  const workflow = deletionRequestWorkflow(request);
  if (workflow.status === "overdue") {
    // Overdue requests still must be processable; the admin UI flags them.
    return;
  }
}

export async function requestAccountDeletion(user: User) {
  if (user.role === "admin") throw new Error("Admin accounts cannot request deletion from this screen.");
  if (user.email.endsWith("@deleted.stayprimeph.local")) throw new Error("This account has already been anonymized.");
  const requestedAt = new Date().toISOString();
  const settings = await getAccountSettings(user);
  await savePrivacySettings(user, {
    ...settings.privacy,
    deletionRequestedAt: requestedAt,
    deletionVerifiedAt: null,
  });
  const token = await issueAuthToken(user.id, "account_deletion", { requestedAt });
  await sendAccountDeletionVerificationEmail({ to: user.email, name: user.name, token });
  return { requestedAt };
}

export async function verifyAccountDeletionRequest(rawToken: string) {
  const token = await consumeAuthToken(rawToken, "account_deletion");
  if (!token) return false;
  const verifiedAt = new Date().toISOString();
  await writeDeletionPrivacyState(token.userId, {
    requestedAt: typeof token.metadata?.requestedAt === "string" ? token.metadata.requestedAt : verifiedAt,
    verifiedAt,
  });
  return true;
}

async function anonymizeUserInJsonStore(target: User) {
  const bookings = await readStoredBookings();
  if (bookings.some((booking) => (booking.guestId === target.id || booking.hostId === target.id) && isActiveBooking(booking))) {
    throw new Error("This account still has an active booking or submitted payment. Resolve those first.");
  }

  const [users, properties, tokens, accountSettings, wishlists, sessions] = await Promise.all([
    readStoredUsers(),
    readStoredProperties(),
    readStoredAuthTokens(),
    readJsonStore<StoredAccountSettings>("account-settings.json"),
    readJsonStore<WishlistItem>("wishlists.json"),
    readStoredSessions(),
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
  await writeStoredSessions(sessions.filter((session) => session.userId !== target.id));
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
    await tx.$executeRaw`DELETE FROM "AuthSession" WHERE "userId" = ${target.id}`;
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
  await requireVerifiedDeletionRequest(target.id);

  if (usesPrismaPersistence()) {
    await anonymizeUserInDatabase(target, adminId);
  } else {
    await anonymizeUserInJsonStore(target);
  }
  await appendAuditLog({
    actorId: adminId,
    actorRole: "admin",
    action: "account.anonymized",
    entityType: "user",
    entityId: target.id,
    metadata: {
      targetRole: target.role,
      deletionVerified: true,
      deletionSlaDays: accountDeletionSlaDays,
      hostedListingsRejected: target.role === "host",
    },
  });
}
