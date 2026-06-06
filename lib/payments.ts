import "server-only";

import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { env } from "@/lib/env";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import {
  confirmManualPaymentInDatabase,
  listPaymentsFromDatabase,
  recordManualPaymentInDatabase,
  rejectManualPaymentInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, Payment, PaymentMethod } from "@/lib/types";

export function getStripe() {
  return env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
}

export function formatPaymentMethod(method: string) {
  if (method === "gcash") return "GCash";
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "stripe") return "Stripe";
  return "Other";
}

export async function getPayments() {
  if (usesPrismaPersistence()) return listPaymentsFromDatabase();
  return readStoredPayments();
}

export async function getPaymentByBookingId(bookingId: string) {
  const payments = await getPayments();
  return payments.find((payment) => payment.bookingId === bookingId) ?? null;
}

function updateBookingPaymentState(
  bookings: Booking[],
  bookingId: string,
  updates: Pick<Booking, "status" | "paymentStatus">,
) {
  return bookings.map((booking) => (booking.id === bookingId ? { ...booking, ...updates } : booking));
}

function normalizeManualMethod(value: FormDataEntryValue | null): PaymentMethod {
  const method = String(value ?? "");
  if (method === "gcash" || method === "bank_transfer" || method === "other") return method;
  throw new Error("Please choose a payment method.");
}

export function readManualPaymentInput(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const paymentMethod = normalizeManualMethod(formData.get("paymentMethod"));
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const transactionId = String(formData.get("referenceNumber") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!bookingId) throw new Error("Booking is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0.");
  if (!transactionId) throw new Error("Reference number is required.");

  return {
    bookingId,
    paymentMethod,
    amount,
    transactionId,
    notes: notes || undefined,
  };
}

export async function submitManualPayment({
  guestId,
  booking,
  paymentInput,
}: {
  guestId: string;
  booking: Booking;
  paymentInput: ReturnType<typeof readManualPaymentInput>;
}) {
  if (booking.guestId !== guestId) throw new Error("Booking request not found.");
  if (booking.status === "cancelled") throw new Error("Cancelled bookings cannot be paid.");
  if (booking.paymentStatus === "paid") throw new Error("This booking is already paid.");

  const existingPayment = await getPaymentByBookingId(booking.id);
  if (existingPayment && existingPayment.paymentStatus !== "rejected") {
    throw new Error("Payment details are already submitted for this booking.");
  }

  if (usesPrismaPersistence()) {
    await recordManualPaymentInDatabase(booking, paymentInput);
    return;
  }

  const now = new Date().toISOString();
  const payments = await readStoredPayments();
  const payment: Payment = {
    id: existingPayment?.id ?? randomUUID(),
    bookingId: booking.id,
    guestId: booking.guestId,
    hostId: booking.hostId,
    amount: paymentInput.amount,
    paymentMethod: paymentInput.paymentMethod,
    paymentStatus: "submitted",
    transactionId: paymentInput.transactionId,
    notes: paymentInput.notes,
    submittedAt: now,
    createdAt: existingPayment?.createdAt ?? now,
    updatedAt: now,
  };

  await writeStoredPayments(existingPayment
    ? payments.map((item) => (item.id === existingPayment.id ? payment : item))
    : [payment, ...payments]);

  const bookings = await readStoredBookings();
  await writeStoredBookings(updateBookingPaymentState(bookings, booking.id, {
    status: "pending",
    paymentStatus: "submitted",
  }));
}

export async function confirmManualPayment({ booking, hostId }: { booking: Booking; hostId: string }) {
  if (booking.hostId !== hostId) throw new Error("Booking request not found.");

  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for confirmation.");
  }

  if (usesPrismaPersistence()) {
    await confirmManualPaymentInDatabase(booking.id, hostId);
    return;
  }

  const now = new Date().toISOString();
  const [payments, bookings] = await Promise.all([readStoredPayments(), readStoredBookings()]);
  await writeStoredPayments(payments.map((item) => item.bookingId === booking.id ? {
    ...item,
    paymentStatus: "paid",
    confirmedBy: hostId,
    confirmedAt: now,
    rejectedAt: undefined,
    rejectionReason: undefined,
    updatedAt: now,
  } : item));
  await writeStoredBookings(updateBookingPaymentState(bookings, booking.id, {
    status: "confirmed",
    paymentStatus: "paid",
  }));
}

export async function rejectManualPayment({
  booking,
  hostId,
  rejectionReason,
}: {
  booking: Booking;
  hostId: string;
  rejectionReason: string;
}) {
  if (booking.hostId !== hostId) throw new Error("Booking request not found.");
  if (!rejectionReason.trim()) throw new Error("Please add a rejection reason.");

  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for review.");
  }

  if (usesPrismaPersistence()) {
    await rejectManualPaymentInDatabase(booking.id, rejectionReason.trim());
    return;
  }

  const now = new Date().toISOString();
  const [payments, bookings] = await Promise.all([readStoredPayments(), readStoredBookings()]);
  await writeStoredPayments(payments.map((item) => item.bookingId === booking.id ? {
    ...item,
    paymentStatus: "rejected",
    rejectionReason: rejectionReason.trim(),
    rejectedAt: now,
    confirmedAt: undefined,
    confirmedBy: undefined,
    updatedAt: now,
  } : item));
  await writeStoredBookings(updateBookingPaymentState(bookings, booking.id, {
    status: "pending",
    paymentStatus: "rejected",
  }));
}
