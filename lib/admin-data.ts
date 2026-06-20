import "server-only";

import { prisma } from "@/lib/db";
import { readStoredBookings } from "@/lib/booking-store";
import { readStoredCancellations } from "@/lib/cancellation-store";
import { enforceDataRetentionOncePerDay } from "@/lib/data-retention";
import { readStoredPayments } from "@/lib/payment-store";
import { readStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { readStoredProperties } from "@/lib/property-store";
import { getAdminDashboardSummaryFromDatabase, listPaymentsFromDatabase, listPlatformLedgerFromDatabase, listReviewsFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredReviews } from "@/lib/review-store";
import type { Dispute, Payment, PlatformLedgerEntry, Report, Review } from "@/lib/types";

export async function getAdminPayments(): Promise<Payment[]> {
  if (!usesPrismaPersistence()) return readStoredPayments();
  return listPaymentsFromDatabase();
}

export async function getPlatformLedger(): Promise<PlatformLedgerEntry[]> {
  if (!usesPrismaPersistence()) return readStoredPlatformLedger();
  return listPlatformLedgerFromDatabase();
}

export async function getAdminReviews(): Promise<Review[]> {
  if (!usesPrismaPersistence()) return readStoredReviews();
  return listReviewsFromDatabase();
}

export async function getAdminDashboardSummary() {
  if (usesPrismaPersistence()) return getAdminDashboardSummaryFromDatabase();

  const [properties, bookings] = await Promise.all([readStoredProperties(), readStoredBookings()]);
  return {
    pendingListings: properties.filter((property) => property.status === "pending").length,
    approvedListings: properties.filter((property) => property.status === "approved").length,
    openBookings: bookings.filter((booking) => booking.status === "pending").length,
    grossBookingValue: bookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
  };
}

export async function getAdminReports(): Promise<Report[]> {
  await enforceDataRetentionOncePerDay();
  if (!usesPrismaPersistence()) return [];

  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" } });
  return reports.map((report) => ({
    id: report.id,
    propertyId: report.propertyId ?? undefined,
    reporterId: report.reporterId ?? undefined,
    type: report.type,
    status: report.status,
    details: report.details,
    createdAt: report.createdAt.toISOString().slice(0, 10),
  }));
}

export async function getAdminDisputes(): Promise<Dispute[]> {
  if (!usesPrismaPersistence()) {
    const cancellations = await readStoredCancellations();
    return cancellations.map((item) => ({
      id: item.id,
      bookingId: item.bookingId,
      propertyId: item.propertyId,
      reason: item.reason ?? "Booking cancellation or dispute requires review.",
      status: item.status,
      createdAt: item.createdAt,
    }));
  }

  const cancellations = await prisma.cancellation.findMany({ orderBy: { createdAt: "desc" } });
  return cancellations.map((item) => ({
    id: item.id,
    bookingId: item.bookingId,
    propertyId: item.propertyId,
    reason: item.reason ?? "Booking cancellation or dispute requires review.",
    status: item.status,
    createdAt: item.createdAt.toISOString().slice(0, 10),
  }));
}
