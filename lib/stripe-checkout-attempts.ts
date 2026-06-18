import "server-only";

import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import {
  beginStripeCheckoutAttemptInDatabase,
  clearStripeCheckoutAttemptInDatabase,
  recordStripeCheckoutSessionInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, Payment } from "@/lib/types";

export const checkoutInProgressMessage = "A payment checkout is already in progress for this booking.";

function pendingTransactionId(bookingId: string) {
  return `checkout-pending-${bookingId}`;
}

function isPendingStripeCheckout(payment: Payment) {
  return payment.paymentMethod === "stripe" && payment.paymentStatus === "pending";
}

export async function beginStripeCheckoutAttempt(booking: Booking) {
  if (usesPrismaPersistence()) return beginStripeCheckoutAttemptInDatabase(booking);

  const payments = await readStoredPayments();
  const existingPayment = payments.find((payment) => payment.bookingId === booking.id);
  if (existingPayment && isPendingStripeCheckout(existingPayment)) {
    throw new Error(checkoutInProgressMessage);
  }

  const now = new Date().toISOString();
  const pendingPayment: Payment = {
    id: existingPayment?.id ?? `payment-${booking.id}`,
    bookingId: booking.id,
    guestId: booking.guestId,
    hostId: booking.hostId,
    amount: booking.totalPrice,
    paymentMethod: "stripe",
    paymentStatus: "pending",
    transactionId: pendingTransactionId(booking.id),
    createdAt: existingPayment?.createdAt ?? now,
    updatedAt: now,
  };

  await writeStoredPayments(
    existingPayment
      ? payments.map((payment) => (payment.id === existingPayment.id ? pendingPayment : payment))
      : [pendingPayment, ...payments],
  );
}

export async function recordStripeCheckoutSession(bookingId: string, sessionId: string) {
  if (!sessionId.trim()) return;
  if (usesPrismaPersistence()) return recordStripeCheckoutSessionInDatabase(bookingId, sessionId);

  const payments = await readStoredPayments();
  await writeStoredPayments(payments.map((payment) => (
    payment.bookingId === bookingId && isPendingStripeCheckout(payment)
      ? { ...payment, transactionId: sessionId.trim(), updatedAt: new Date().toISOString() }
      : payment
  )));
}

export async function clearStripeCheckoutAttempt(bookingId: string) {
  if (usesPrismaPersistence()) return clearStripeCheckoutAttemptInDatabase(bookingId);

  const payments = await readStoredPayments();
  await writeStoredPayments(payments.filter((payment) => (
    !(payment.bookingId === bookingId && isPendingStripeCheckout(payment))
  )));
}
