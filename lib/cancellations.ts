import "server-only";

import { appendAuditLog } from "@/lib/audit-logs";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredCancellations, writeStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { listCancellationsFromDatabase, resolveCancellationReviewInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { Booking, Cancellation, Payment } from "@/lib/types";

export type CancellationResolution = "refund" | "no_refund";

const reviewRequiredMessage = "No cancellation is waiting for admin review.";

export async function getCancellations() {
  if (usesPrismaPersistence()) return listCancellationsFromDatabase();
  return readStoredCancellations();
}

function resolvedBookingPaymentStatus(booking: Booking, resolution: CancellationResolution): Booking["paymentStatus"] {
  if (resolution === "refund") return "refunded";
  if (booking.paymentStatus === "submitted") return "rejected";
  return booking.paymentStatus;
}

function resolvedPayment(payment: Payment, resolution: CancellationResolution, now: string): Payment {
  if (resolution === "refund") {
    return {
      ...payment,
      paymentStatus: "refunded",
      rejectedAt: undefined,
      rejectionReason: undefined,
      updatedAt: now,
    };
  }

  if (payment.paymentStatus !== "submitted") {
    return { ...payment, updatedAt: now };
  }

  return {
    ...payment,
    paymentStatus: "rejected",
    rejectionReason: "Cancellation closed without refund.",
    rejectedAt: now,
    confirmedAt: undefined,
    confirmedBy: undefined,
    updatedAt: now,
  };
}

export async function resolveCancellationReview({
  bookingId,
  resolution,
  adminId,
}: {
  bookingId: string;
  resolution: CancellationResolution;
  adminId: string;
}) {
  if (!bookingId.trim()) throw new Error("Booking is required.");
  if (usesPrismaPersistence()) {
    await resolveCancellationReviewInDatabase({ bookingId, resolution, adminId });
    return;
  }

  const [bookings, cancellations, payments] = await Promise.all([
    readStoredBookings(),
    readStoredCancellations(),
    readStoredPayments(),
  ]);
  const booking = bookings.find((item) => item.id === bookingId);
  const cancellation = cancellations.find((item) => item.bookingId === bookingId);
  if (!booking || !cancellation || cancellation.status !== "review") {
    throw new Error(reviewRequiredMessage);
  }

  const now = new Date().toISOString();
  const nextCancellationStatus: Cancellation["status"] = resolution === "refund" ? "refunded" : "closed";
  const payment = payments.find((item) => item.bookingId === bookingId);

  await writeStoredCancellations(cancellations.map((item) => (
    item.bookingId === bookingId ? { ...item, status: nextCancellationStatus } : item
  )));
  await writeStoredBookings(bookings.map((item) => (
    item.id === bookingId
      ? { ...item, status: "cancelled", paymentStatus: resolvedBookingPaymentStatus(item, resolution) }
      : item
  )));
  await writeStoredPayments(payments.map((payment) => (
    payment.bookingId === bookingId ? resolvedPayment(payment, resolution, now) : payment
  )));
  if (resolution === "refund") {
    await appendAuditLog({
      actorId: adminId,
      actorRole: "admin",
      action: "payment.refunded",
      entityType: "payment",
      entityId: payment?.id ?? bookingId,
      metadata: {
        bookingId,
        cancellationId: cancellation.id,
        previousPaymentStatus: booking.paymentStatus,
        cancellationResolution: resolution,
      },
    });
  } else if (booking.paymentStatus === "submitted") {
    await appendAuditLog({
      actorId: adminId,
      actorRole: "admin",
      action: "payment.rejected",
      entityType: "payment",
      entityId: payment?.id ?? bookingId,
      metadata: {
        bookingId,
        cancellationId: cancellation.id,
        previousPaymentStatus: booking.paymentStatus,
        reason: "Cancellation closed without refund.",
        cancellationResolution: resolution,
      },
    });
  }
}
