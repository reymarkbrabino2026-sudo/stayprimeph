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
  recordManualPaymentInDatabase,
  rejectManualPaymentInDatabase,
  usesPrismaPersistence,
} from "@/lib/repositories";
import type { Booking, Payment, PaymentMethod } from "@/lib/types";

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
  if (paymentInput.bookingId !== booking.id) throw new Error("Payment does not match this booking.");
  if (booking.guestId !== guestId) throw new Error("Booking request not found.");
  if (booking.status === "cancelled") throw new Error("Cancelled bookings cannot be paid.");
  if (booking.status === "completed") throw new Error("Completed bookings cannot accept new payment details.");
  if (booking.paymentStatus === "paid") throw new Error("This booking is already paid.");
  if (paymentInput.amount !== booking.totalPrice) throw new Error("Submitted payment amount does not match the booking total.");

  const existingPayment = await getPaymentByBookingId(booking.id);
  if (existingPayment && existingPayment.paymentStatus !== "rejected") {
    throw new Error("Payment details are already submitted for this booking.");
  }

  if (usesPrismaPersistence()) {
    await recordManualPaymentInDatabase(booking, paymentInput);
    return;
  }

  const now = new Date().toISOString();
  const [payments, bookings] = await Promise.all([readStoredPayments(), readStoredBookings()]);
  assertUniquePaymentReference(payments, {
    bookingId: booking.id,
    paymentMethod: paymentInput.paymentMethod,
    transactionId: paymentInput.transactionId,
  });

  const payment: Payment = {
    id: existingPayment?.id ?? `payment-${booking.id}`,
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
  await writeStoredBookings(updateBookingPaymentState(bookings, booking.id, {
    status: "pending",
    paymentStatus: "submitted",
  }));
}

type ManualPaymentReviewerRole = "admin" | "host";

async function confirmSubmittedManualPayment({
  booking,
  actorId,
  actorRole,
}: {
  booking: Booking;
  actorId: string;
  actorRole: ManualPaymentReviewerRole;
}) {
  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for verification.");
  }
  if (payment.amount !== booking.totalPrice) {
    throw new Error("Submitted payment amount does not match the booking total.");
  }

  if (usesPrismaPersistence()) {
    await confirmManualPaymentInDatabase(booking.id, actorId, actorRole);
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
    confirmedBy: actorId,
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
    actorId,
    actorRole,
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

export async function confirmManualPayment({ booking, hostId }: { booking: Booking; hostId: string }) {
  if (booking.hostId !== hostId) throw new Error("Booking request not found.");
  await confirmSubmittedManualPayment({ booking, actorId: hostId, actorRole: "host" });
}

export async function verifySubmittedPaymentByAdmin({ booking, adminId }: { booking: Booking; adminId: string }) {
  await confirmSubmittedManualPayment({ booking, actorId: adminId, actorRole: "admin" });
}

async function rejectSubmittedManualPayment({
  booking,
  actorId,
  actorRole,
  rejectionReason,
}: {
  booking: Booking;
  actorId: string;
  actorRole: ManualPaymentReviewerRole;
  rejectionReason: string;
}) {
  if (!rejectionReason.trim()) throw new Error("Please add a rejection reason.");

  const payment = await getPaymentByBookingId(booking.id);
  if (!payment || payment.paymentStatus !== "submitted") {
    throw new Error("No submitted payment is waiting for verification.");
  }

  if (usesPrismaPersistence()) {
    await rejectManualPaymentInDatabase(booking.id, rejectionReason.trim(), actorId, actorRole);
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
    actorId,
    actorRole,
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

export async function rejectSubmittedPaymentByAdmin({
  booking,
  adminId,
  rejectionReason,
}: {
  booking: Booking;
  adminId: string;
  rejectionReason: string;
}) {
  await rejectSubmittedManualPayment({ booking, actorId: adminId, actorRole: "admin", rejectionReason });
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
  await rejectSubmittedManualPayment({ booking, actorId: hostId, actorRole: "host", rejectionReason });
}
