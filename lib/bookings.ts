import { randomUUID } from "node:crypto";
import { appendAuditLog } from "@/lib/audit-logs";
import { bookingBlocksRequestedPackage } from "@/lib/booking-conflicts";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredCancellations, writeStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { assertUniquePaymentReference } from "@/lib/payment-references";
import { readStoredPlatformLedger, writeStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { cancelBookingInDatabase, listBookingsForGuestFromDatabase, listBookingsForHostFromDatabase, listBookingsForPropertyFromDatabase, listBookingsFromDatabase, updateBookingPaymentInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { Booking, BookingPackage, Cancellation, Payment } from "@/lib/types";

export function sortBookingsByStayDate<T extends Pick<Booking, "checkIn" | "checkOut" | "createdAt" | "id">>(bookings: T[]) {
  return [...bookings].sort((a, b) =>
    a.checkIn.localeCompare(b.checkIn) ||
    a.checkOut.localeCompare(b.checkOut) ||
    b.createdAt.localeCompare(a.createdAt) ||
    a.id.localeCompare(b.id),
  );
}

export async function getBookings() {
  if (usesPrismaPersistence()) return listBookingsFromDatabase();
  return readStoredBookings();
}

export async function getBookingsForProperty(propertyId: string) {
  if (usesPrismaPersistence()) return listBookingsForPropertyFromDatabase(propertyId);
  const bookings = await readStoredBookings();
  return bookings.filter((booking) => booking.propertyId === propertyId);
}

export async function getBookingsForHost(hostId: string) {
  if (usesPrismaPersistence()) return listBookingsForHostFromDatabase(hostId);
  const bookings = await readStoredBookings();
  return sortBookingsByStayDate(bookings.filter((booking) => booking.hostId === hostId));
}

export async function getBookingsForGuest(guestId: string) {
  if (usesPrismaPersistence()) return listBookingsForGuestFromDatabase(guestId);
  const bookings = await readStoredBookings();
  return bookings.filter((booking) => booking.guestId === guestId);
}

export async function getBookingById(id: string) {
  const bookings = await getBookings();
  return bookings.find((booking) => booking.id === id) ?? null;
}

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isExpiredUnpaidBooking(booking: Pick<Booking, "checkIn" | "paymentStatus" | "status">, now = new Date()) {
  if (booking.status === "cancelled") return false;
  if (booking.paymentStatus !== "pending" && booking.paymentStatus !== "rejected") return false;
  const checkInTime = new Date(`${booking.checkIn}T00:00:00`).getTime();
  return Number.isFinite(checkInTime) && checkInTime < startOfLocalDay(now);
}

export function hasDateConflict(bookings: Booking[], propertyId: string, checkIn: string, checkOut: string, packageId?: string | null, packages: BookingPackage[] = []) {
  const requestedStart = new Date(checkIn).getTime();
  const requestedEnd = new Date(checkOut).getTime();

  return bookings.some((booking) => {
    if (booking.propertyId !== propertyId || booking.status === "cancelled") return false;
    if (isExpiredUnpaidBooking(booking)) return false;
    const existingStart = new Date(booking.checkIn).getTime();
    const existingEnd = new Date(booking.checkOut).getTime();
    return requestedStart < existingEnd && requestedEnd > existingStart && bookingBlocksRequestedPackage(booking, packageId, packages);
  });
}

export async function markBookingPaid(bookingId: string, transactionId: string) {
  const providerTransactionId = transactionId.trim();
  if (!providerTransactionId) throw new Error("Provider transaction ID is required.");
  if (usesPrismaPersistence()) return updateBookingPaymentInDatabase(bookingId, "paid", providerTransactionId);
  const [bookings, payments] = await Promise.all([readStoredBookings(), readStoredPayments()]);
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) return;
  assertUniquePaymentReference(payments, {
    bookingId,
    paymentMethod: "stripe",
    transactionId: providerTransactionId,
  });

  const now = new Date().toISOString();
  const existingPayment = payments.find((payment) => payment.bookingId === bookingId);
  const payment: Payment = {
    id: existingPayment?.id ?? `payment-${bookingId}`,
    bookingId,
    guestId: booking.guestId,
    hostId: booking.hostId,
    amount: booking.totalPrice,
    paymentMethod: "stripe",
    paymentStatus: "paid",
    transactionId: providerTransactionId,
    submittedAt: existingPayment?.submittedAt ?? now,
    confirmedAt: now,
    createdAt: existingPayment?.createdAt ?? now,
    updatedAt: now,
  };
  await writeStoredBookings(bookings.map((item) => item.id === bookingId ? { ...item, status: "confirmed", paymentStatus: "paid" } : item));
  await writeStoredPayments(existingPayment
    ? payments.map((item) => (item.id === existingPayment.id ? payment : item))
    : [payment, ...payments]);

  const ledger = await readStoredPlatformLedger();
  const entry = {
    id: `platform-${bookingId}`,
    bookingId,
    paymentId: payment.id,
    amount: calculateStayprimeMarkupFromTotal(booking.totalPrice),
    source: "stripe" as const,
    destination: "stayprime_bank" as const,
    status: "banked" as const,
    createdAt: now,
  };
  await writeStoredPlatformLedger(
    ledger.some((item) => item.bookingId === bookingId)
      ? ledger.map((item) => (item.bookingId === bookingId ? entry : item))
      : [entry, ...ledger],
  );
  await appendAuditLog({
    actorId: "system",
    actorRole: "system",
    action: "payment.approved",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      bookingId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      source: "provider_webhook",
    },
  });
}

type CancellationOptions = {
  status?: Cancellation["status"];
  policySummary?: string;
  policyOutcome?: string;
  refundPercent?: number;
  refundAmount?: number;
  paidAmount?: number;
};

function getCancellationStatus(booking: Booking) {
  return booking.paymentStatus === "paid" || booking.paymentStatus === "partially_paid" || booking.paymentStatus === "submitted" ? "review" : "closed";
}

function cancellationReasonWithPolicy(reason: string | undefined, policySummary: string | undefined) {
  return [reason?.trim(), policySummary?.trim()].filter(Boolean).join("\n\n") || undefined;
}

export async function cancelBookingByGuest(booking: Booking, reason?: string, options: CancellationOptions = {}): Promise<Cancellation> {
  const cancellationReason = cancellationReasonWithPolicy(reason, options.policySummary);
  const cancellation: Cancellation = {
    id: randomUUID(),
    bookingId: booking.id,
    propertyId: booking.propertyId,
    reason: cancellationReason,
    status: options.status ?? getCancellationStatus(booking),
    createdAt: new Date().toISOString(),
  };

  if (usesPrismaPersistence()) {
    await cancelBookingInDatabase({
      ...cancellation,
      actorId: booking.guestId,
      actorRole: "guest",
      paymentStatus: booking.paymentStatus,
      policyOutcome: options.policyOutcome,
      refundPercent: options.refundPercent,
      refundAmount: options.refundAmount,
      paidAmount: options.paidAmount,
    });
    return cancellation;
  }

  const [bookings, cancellations] = await Promise.all([readStoredBookings(), readStoredCancellations()]);

  await writeStoredBookings(bookings.map((item) => (item.id === booking.id ? { ...item, status: "cancelled" } : item)));
  await writeStoredCancellations(
    cancellations.some((item) => item.bookingId === booking.id)
      ? cancellations.map((item) => (item.bookingId === booking.id ? { ...item, ...cancellation, id: item.id, createdAt: item.createdAt } : item))
      : [cancellation, ...cancellations],
  );
  await appendAuditLog({
    actorId: booking.guestId,
    actorRole: "guest",
    action: "booking.cancelled",
    entityType: "booking",
    entityId: booking.id,
    metadata: {
      propertyId: booking.propertyId,
      cancellationId: cancellation.id,
      cancellationStatus: cancellation.status,
      paymentStatus: booking.paymentStatus,
      reason: reason ?? null,
      policyOutcome: options.policyOutcome ?? null,
      refundPercent: options.refundPercent ?? null,
      refundAmount: options.refundAmount ?? null,
      paidAmount: options.paidAmount ?? null,
    },
  });

  return cancellation;
}
