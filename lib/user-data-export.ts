import "server-only";

import { getAccountSettings, savePrivacySettings } from "@/lib/account-settings";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getBookings } from "@/lib/bookings";
import { getCancellations } from "@/lib/cancellations";
import { prisma } from "@/lib/db";
import { readHostExpenses } from "@/lib/host-expense-store";
import { readHostMonthlyReports } from "@/lib/host-report-store";
import { readJsonStore } from "@/lib/json-store";
import { getMessagesForUser } from "@/lib/messages";
import { getAdminPayments, getAdminReviews } from "@/lib/admin-data";
import { getProperties } from "@/lib/properties";
import { usesPrismaPersistence } from "@/lib/repositories";
import { readStoredAuthTokens } from "@/lib/auth-token-store";
import { readStoredSessions } from "@/lib/session-store";
import type { AuthToken, Booking, Payment, Property, Report, Review, User, WishlistItem } from "@/lib/types";

type ExportableUser = Omit<User, "passwordHash"> & {
  hasPassword: boolean;
};

type SecurityExport = {
  activeSessionCount: number;
  pendingAuthTokens: Array<Pick<AuthToken, "type" | "expiresAt" | "createdAt">>;
};

export type UserDataExport = {
  exportVersion: 1;
  generatedAt: string;
  user: ExportableUser;
  accountSettings: Awaited<ReturnType<typeof getAccountSettings>>;
  listings: Property[];
  bookings: Booking[];
  messages: Awaited<ReturnType<typeof getMessagesForUser>>;
  payments: Payment[];
  reviews: Review[];
  wishlists: WishlistItem[];
  cancellations: Awaited<ReturnType<typeof getCancellations>>;
  availabilityBlocks: Awaited<ReturnType<typeof getAvailabilityBlocks>>;
  hostExpenses: Awaited<ReturnType<typeof readHostExpenses>>;
  hostMonthlyReports: Awaited<ReturnType<typeof readHostMonthlyReports>>;
  supportReports: Report[];
  security: SecurityExport;
};

function exportableUser(user: User): ExportableUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    createdAt: user.createdAt,
    emailVerifiedAt: user.emailVerifiedAt,
    passwordChangedAt: user.passwordChangedAt,
    hasPassword: Boolean(user.passwordHash),
  };
}

function relevantPayment(payment: Payment, user: User, bookingIds: Set<string>) {
  return payment.guestId === user.id || payment.hostId === user.id || bookingIds.has(payment.bookingId);
}

function relevantCancellation(cancellation: Awaited<ReturnType<typeof getCancellations>>[number], bookingIds: Set<string>, hostedPropertyIds: Set<string>) {
  return bookingIds.has(cancellation.bookingId) || hostedPropertyIds.has(cancellation.propertyId);
}

function relevantReview(review: Review, user: User, hostedPropertyIds: Set<string>) {
  return review.guestId === user.id || hostedPropertyIds.has(review.propertyId);
}

async function listWishlistsForUser(userId: string): Promise<WishlistItem[]> {
  if (usesPrismaPersistence()) {
    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });
    return wishlists.map((wishlist) => ({
      id: wishlist.id,
      userId: wishlist.userId,
      propertyId: wishlist.propertyId,
    }));
  }

  const wishlists = await readJsonStore<WishlistItem>("wishlists.json");
  return wishlists.filter((wishlist) => wishlist.userId === userId);
}

async function listSupportReportsForUser(user: User, hostedPropertyIds: Set<string>): Promise<Report[]> {
  if (usesPrismaPersistence()) {
    const reports = await prisma.report.findMany({
      where: {
        OR: [
          { reporterId: user.id },
          { propertyId: { in: [...hostedPropertyIds] } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return reports.map((report) => ({
      id: report.id,
      propertyId: report.propertyId ?? undefined,
      reporterId: report.reporterId ?? undefined,
      type: report.type,
      status: report.status,
      details: report.details,
      createdAt: report.createdAt.toISOString(),
    }));
  }

  const reports = await readJsonStore<Report>("reports.json");
  return reports.filter((report) => report.reporterId === user.id || (report.propertyId ? hostedPropertyIds.has(report.propertyId) : false));
}

async function securityExport(userId: string): Promise<SecurityExport> {
  if (usesPrismaPersistence()) {
    const [activeSessionCount, pendingAuthTokens] = await Promise.all([
      prisma.authSession.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.authToken.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        select: {
          type: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      activeSessionCount,
      pendingAuthTokens: pendingAuthTokens.map((token) => ({
        type: token.type.startsWith("email_change:") ? "email_change" : token.type as AuthToken["type"],
        expiresAt: token.expiresAt.toISOString(),
        createdAt: token.createdAt.toISOString(),
      })),
    };
  }

  const now = new Date().toISOString();
  const [sessions, tokens] = await Promise.all([readStoredSessions(), readStoredAuthTokens()]);
  return {
    activeSessionCount: sessions.filter((session) => session.userId === userId && session.expiresAt > now).length,
    pendingAuthTokens: tokens
      .filter((token) => token.userId === userId && token.expiresAt > now)
      .map((token) => ({
        type: token.type,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      })),
  };
}

export function userDataExportFilename(user: Pick<User, "id">, generatedAt: string) {
  const date = generatedAt.slice(0, 10);
  return `stayprimeph-data-export-${user.id}-${date}.json`;
}

export async function buildUserDataExport(user: User, now = new Date()): Promise<UserDataExport> {
  const [
    accountSettings,
    properties,
    bookings,
    messages,
    payments,
    reviews,
    wishlists,
    cancellations,
    availabilityBlocks,
    hostExpenses,
    hostMonthlyReports,
  ] = await Promise.all([
    getAccountSettings(user),
    getProperties(),
    getBookings(),
    getMessagesForUser(user.id),
    getAdminPayments(),
    getAdminReviews(),
    listWishlistsForUser(user.id),
    getCancellations(),
    getAvailabilityBlocks(),
    readHostExpenses(),
    readHostMonthlyReports(),
  ]);

  const hostedListings = properties.filter((property) => property.hostId === user.id);
  const hostedPropertyIds = new Set(hostedListings.map((property) => property.id));
  const userBookings = bookings.filter((booking) => booking.guestId === user.id || booking.hostId === user.id);
  const bookingIds = new Set(userBookings.map((booking) => booking.id));
  const generatedAt = now.toISOString();

  return {
    exportVersion: 1,
    generatedAt,
    user: exportableUser(user),
    accountSettings,
    listings: hostedListings,
    bookings: userBookings,
    messages,
    payments: payments.filter((payment) => relevantPayment(payment, user, bookingIds)),
    reviews: reviews.filter((review) => relevantReview(review, user, hostedPropertyIds)),
    wishlists,
    cancellations: cancellations.filter((cancellation) => relevantCancellation(cancellation, bookingIds, hostedPropertyIds)),
    availabilityBlocks: availabilityBlocks.filter((block) => hostedPropertyIds.has(block.propertyId)),
    hostExpenses: hostExpenses.filter((expense) => expense.hostId === user.id),
    hostMonthlyReports: hostMonthlyReports.filter((report) => report.hostId === user.id),
    supportReports: await listSupportReportsForUser(user, hostedPropertyIds),
    security: await securityExport(user.id),
  };
}

export async function requestUserDataExport(user: User) {
  const currentSettings = await getAccountSettings(user);
  const requestedAt = new Date().toISOString();
  await savePrivacySettings(user, {
    ...currentSettings.privacy,
    dataRequestedAt: requestedAt,
  });
  const data = await buildUserDataExport(user, new Date(requestedAt));
  return {
    filename: userDataExportFilename(user, data.generatedAt),
    contentType: "application/json",
    data,
  };
}
