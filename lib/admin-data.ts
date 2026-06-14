import "server-only";

import { prisma } from "@/lib/db";
import { readStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments } from "@/lib/payment-store";
import { listPaymentsFromDatabase, listReviewsFromDatabase, usesPrismaPersistence } from "@/lib/repositories";
import { readStoredReviews } from "@/lib/review-store";
import type { Dispute, Payment, Report, Review } from "@/lib/types";

export async function getAdminPayments(): Promise<Payment[]> {
  if (!usesPrismaPersistence()) return readStoredPayments();
  return listPaymentsFromDatabase();
}

export async function getAdminReviews(): Promise<Review[]> {
  if (!usesPrismaPersistence()) return readStoredReviews();
  return listReviewsFromDatabase();
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
