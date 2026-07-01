import "server-only";

import { prisma } from "@/lib/db";
import { getAvailabilityBlocks } from "@/lib/availability";
import { getBookings } from "@/lib/bookings";
import { readStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments } from "@/lib/payment-store";
import { paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import { readStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { getProperties } from "@/lib/properties";
import { listPaymentsFromDatabase, listPlatformLedgerFromDatabase, listReviewsFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
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
  const [properties, bookings, availabilityBlocks] = await Promise.all([getProperties(), getBookings(), getAvailabilityBlocks()]);
  const paidBlocks = paidAvailabilityBlocksForProperties(availabilityBlocks, properties);
  const grossBookingValue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const externalPaidValue = paidBlocks.reduce((sum, block) => sum + block.totalPrice, 0);
  const todayKey = new Date().toISOString().slice(0, 10);

  return {
    pendingListings: properties.filter((property) => property.status === "pending").length,
    approvedListings: properties.filter((property) => property.status === "approved").length,
    openBookings: bookings.filter((booking) => booking.status === "pending").length + paidBlocks.filter((block) => block.date >= todayKey).length,
    grossBookingValue: grossBookingValue + externalPaidValue,
    stayprimeEarningsValue: calculateStayprimeMarkupFromTotal(grossBookingValue),
    externalPaidBlocks: paidBlocks.length,
    externalPaidValue,
  };
}

export async function getAdminReports(): Promise<Report[]> {
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
