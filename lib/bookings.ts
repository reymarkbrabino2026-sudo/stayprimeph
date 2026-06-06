import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { listBookingsFromDatabase, updateBookingPaymentInDatabase, usesPrismaPersistence } from "@/lib/repositories";
import type { Payment } from "@/lib/types";
import type { Booking } from "@/lib/types";

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
  if (usesPrismaPersistence()) return updateBookingPaymentInDatabase(bookingId, "paid", transactionId);
  const bookings = await readStoredBookings();
  const booking = bookings.find((item) => item.id === bookingId);
  await writeStoredBookings(bookings.map((item) => item.id === bookingId ? { ...item, paymentStatus: "paid" } : item));
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
    transactionId,
    submittedAt: existingPayment?.submittedAt ?? now,
    confirmedAt: now,
    createdAt: existingPayment?.createdAt ?? now,
    updatedAt: now,
  };
  await writeStoredPayments(existingPayment
    ? payments.map((item) => (item.id === existingPayment.id ? payment : item))
    : [payment, ...payments]);
}
