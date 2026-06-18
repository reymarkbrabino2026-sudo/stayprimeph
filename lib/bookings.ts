import { randomUUID } from "node:crypto";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredCancellations, writeStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { readStoredPlatformLedger, writeStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import { cancelBookingInDatabase, listBookingsFromDatabase, updateBookingPaymentInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { Booking, Cancellation, Payment } from "@/lib/types";

export async function getBookings() {
  if (usesPrismaPersistence()) return listBookingsFromDatabase();
  return readStoredBookings();
}

export async function getBookingById(id: string) {
  const bookings = await getBookings();
  return bookings.find((booking) => booking.id === id) ?? null;
}

export function hasDateConflict(bookings: Booking[], propertyId: string, checkIn: string, checkOut: string) {
  const requestedStart = new Date(checkIn).getTime();
  const requestedEnd = new Date(checkOut).getTime();

  return bookings.some((booking) => {
    if (booking.propertyId !== propertyId || booking.status === "cancelled") return false;
    const existingStart = new Date(booking.checkIn).getTime();
    const existingEnd = new Date(booking.checkOut).getTime();
    return requestedStart < existingEnd && requestedEnd > existingStart;
  });
}

export async function markBookingPaid(bookingId: string, transactionId: string) {
  const providerTransactionId = transactionId.trim();
  if (!providerTransactionId) throw new Error("Provider transaction ID is required.");
  if (usesPrismaPersistence()) return updateBookingPaymentInDatabase(bookingId, "paid", providerTransactionId);
  const bookings = await readStoredBookings();
  const booking = bookings.find((item) => item.id === bookingId);
  await writeStoredBookings(bookings.map((item) => item.id === bookingId ? { ...item, status: "confirmed", paymentStatus: "paid" } : item));
  if (!booking) return;

  const now = new Date().toISOString();
  const payments = await readStoredPayments();
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
}

function getCancellationStatus(booking: Booking) {
  return booking.paymentStatus === "paid" || booking.paymentStatus === "submitted" ? "review" : "closed";
}

export async function cancelBookingByGuest(booking: Booking, reason?: string): Promise<Cancellation> {
  const cancellation: Cancellation = {
    id: randomUUID(),
    bookingId: booking.id,
    propertyId: booking.propertyId,
    reason,
    status: getCancellationStatus(booking),
    createdAt: new Date().toISOString(),
  };

  if (usesPrismaPersistence()) {
    await cancelBookingInDatabase(cancellation);
    return cancellation;
  }

  const [bookings, cancellations] = await Promise.all([readStoredBookings(), readStoredCancellations()]);

  await writeStoredBookings(bookings.map((item) => (item.id === booking.id ? { ...item, status: "cancelled" } : item)));
  await writeStoredCancellations(
    cancellations.some((item) => item.bookingId === booking.id)
      ? cancellations.map((item) => (item.bookingId === booking.id ? { ...item, ...cancellation, id: item.id, createdAt: item.createdAt } : item))
      : [cancellation, ...cancellations],
  );

  return cancellation;
}
