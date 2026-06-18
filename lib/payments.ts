import "server-only";

import Stripe from "stripe";
import { appendAuditLog } from "@/lib/audit-logs";
import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { env } from "@/lib/env";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { assertUniquePaymentReference } from "@/lib/payment-references";
import { readStoredPlatformLedger, writeStoredPlatformLedger } from "@/lib/platform-ledger-store";
import { calculateStayprimeMarkupFromTotal } from "@/lib/pricing";
import {
  confirmManualPaymentInDatabase,
  listPaymentsFromDatabase,
  rejectManualPaymentInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, PaymentMethod } from "@/lib/types";

const paidBookingsDisabledMessage = "Paid bookings are disabled until StayPrimePH launches a verified payment provider.";

export function getPaymentLaunchMode() {
  return env.PAYMENT_LAUNCH_MODE;
}

function isStripeLaunchMode() {
  return env.PAYMENT_LAUNCH_MODE === "stripe";
}

export function isStripeCheckoutEnabled() {
  return isStripeLaunchMode() && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function arePaidBookingsEnabled() {
  return isStripeCheckoutEnabled();
}

export function assertPaidBookingsEnabled() {
  if (!arePaidBookingsEnabled()) throw new Error(paidBookingsDisabledMessage);
}

export function getStripe(): Stripe | null {
  if (!isStripeCheckoutEnabled() || !env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY);
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
  void guestId;
  void booking;
  void paymentInput;
  throw new Error(paidBookingsDisabledMessage);
}

export async function confirmManualPayment({ booking, hostId }: { booking: Booking; hostId: string }) {
  void booking;
  void hostId;
  throw new Error("Only platform admins can verify submitted payments.");
}

export async function verifySubmittedPaymentByAdmin({ booking, adminId }: { booking: Booking; adminId: string }) {
  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for platform verification.");
  }
  if (payment.amount !== booking.totalPrice) {
    throw new Error("Submitted payment amount does not match the booking total.");
  }

  if (usesPrismaPersistence()) {
    await confirmManualPaymentInDatabase(booking.id, adminId);
    return;
  }

  const now = new Date().toISOString();
  const [payments, bookings] = await Promise.all([readStoredPayments(), readStoredBookings()]);
  assertUniquePaymentReference(payments, {
    bookingId: booking.id,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
  });
  const platformAmount = calculateStayprimeMarkupFromTotal(booking.totalPrice);
  await writeStoredPayments(payments.map((item) => item.bookingId === booking.id ? {
    ...item,
    paymentStatus: "paid",
    confirmedBy: adminId,
    confirmedAt: now,
    rejectedAt: undefined,
    rejectionReason: undefined,
    updatedAt: now,
  } : item));
  await writeStoredBookings(updateBookingPaymentState(bookings, booking.id, {
    status: "confirmed",
    paymentStatus: "paid",
  }));

  const ledger = await readStoredPlatformLedger();
  const entry = {
    id: `platform-${booking.id}`,
    bookingId: booking.id,
    paymentId: payment.id,
    amount: platformAmount,
    source: "manual_payment" as const,
    destination: "stayprime_bank" as const,
    status: "banked" as const,
    createdAt: now,
  };
  await writeStoredPlatformLedger(
    ledger.some((item) => item.bookingId === booking.id)
      ? ledger.map((item) => (item.bookingId === booking.id ? entry : item))
      : [entry, ...ledger],
  );
  await appendAuditLog({
    actorId: adminId,
    actorRole: "admin",
    action: "payment.approved",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      bookingId: booking.id,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
    },
  });
}

export async function rejectSubmittedPaymentByAdmin({
  booking,
  adminId,
  rejectionReason,
}: {
  booking: Booking;
  adminId: string;
  rejectionReason: string;
}) {
  if (!rejectionReason.trim()) throw new Error("Please add a rejection reason.");

  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for platform verification.");
  }

  if (usesPrismaPersistence()) {
    await rejectManualPaymentInDatabase(booking.id, rejectionReason.trim(), adminId);
    return;
  }

  const now = new Date().toISOString();
  const [payments, bookings] = await Promise.all([readStoredPayments(), readStoredBookings()]);
  const rejectedPayment = payments.find((item) => item.bookingId === booking.id);
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
  await appendAuditLog({
    actorId: adminId,
    actorRole: "admin",
    action: "payment.rejected",
    entityType: "payment",
    entityId: rejectedPayment?.id ?? booking.id,
    metadata: {
      bookingId: booking.id,
      amount: rejectedPayment?.amount ?? booking.totalPrice,
      paymentMethod: rejectedPayment?.paymentMethod ?? null,
      transactionId: rejectedPayment?.transactionId ?? null,
      reason: rejectionReason.trim(),
    },
  });
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
  void booking;
  void hostId;
  void rejectionReason;
  throw new Error("Only platform admins can reject submitted payments.");
}
