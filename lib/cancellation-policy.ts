import type { Booking, Payment } from "@/lib/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CancellationPolicyOutcome =
  | "no_payment"
  | "payment_review"
  | "full_refund"
  | "partial_refund"
  | "manual_review"
  | "no_refund";

export type CancellationPolicy = {
  outcome: CancellationPolicyOutcome;
  cancellationStatus: "closed" | "review";
  title: string;
  message: string;
  refundLabel: string;
  adminSummary: string;
  paidAmount: number;
  refundAmount: number;
  refundPercent: number;
  paymentReceivedAt?: string;
  hoursSincePayment?: number;
  hoursUntilCheckIn: number;
};

type PolicyInput = {
  booking: Pick<Booking, "checkIn" | "createdAt" | "paymentStatus" | "totalPrice">;
  payment?: Pick<Payment, "amount" | "confirmedAt" | "createdAt" | "paymentStatus" | "submittedAt"> | null;
  now?: Date;
};

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCheckInDate(checkIn: string) {
  const checkInDate = new Date(`${checkIn}T14:00:00`);
  return Number.isNaN(checkInDate.getTime()) ? new Date(checkIn) : checkInDate;
}

function getPaymentReceivedDate({ booking, payment }: Pick<PolicyInput, "booking" | "payment">) {
  return (
    parseDate(payment?.confirmedAt) ??
    parseDate(payment?.submittedAt) ??
    parseDate(payment?.createdAt) ??
    parseDate(booking.createdAt) ??
    new Date()
  );
}

function paidAmountForPolicy(booking: PolicyInput["booking"], payment: PolicyInput["payment"]) {
  if (payment?.amount && payment.amount > 0) return Math.min(payment.amount, booking.totalPrice);
  if (booking.paymentStatus === "paid") return booking.totalPrice;
  return 0;
}

function buildPolicy({
  outcome,
  cancellationStatus,
  title,
  message,
  refundLabel,
  paidAmount,
  refundPercent,
  paymentReceivedAt,
  hoursSincePayment,
  hoursUntilCheckIn,
}: Omit<CancellationPolicy, "adminSummary" | "refundAmount">): CancellationPolicy {
  const refundAmount = Math.round(paidAmount * refundPercent);
  const adminSummary = [
    `Policy: ${title}`,
    `Outcome: ${outcome}`,
    `Refund recommendation: ${refundLabel}`,
    paidAmount > 0 ? `Paid amount reviewed: ${paidAmount}` : null,
    refundPercent > 0 ? `Recommended refund percent: ${Math.round(refundPercent * 100)}%` : null,
    refundAmount > 0 ? `Recommended refund amount: ${refundAmount}` : null,
    paymentReceivedAt ? `Payment timestamp used: ${paymentReceivedAt}` : null,
  ].filter(Boolean).join("\n");

  return {
    outcome,
    cancellationStatus,
    title,
    message,
    refundLabel,
    adminSummary,
    paidAmount,
    refundAmount,
    refundPercent,
    paymentReceivedAt,
    hoursSincePayment,
    hoursUntilCheckIn,
  };
}

export function evaluateCancellationPolicy({
  booking,
  payment = null,
  now = new Date(),
}: PolicyInput): CancellationPolicy {
  const checkInDate = parseCheckInDate(booking.checkIn);
  const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / HOUR_MS;

  if (booking.paymentStatus === "pending" || booking.paymentStatus === "rejected") {
    return buildPolicy({
      outcome: "no_payment",
      cancellationStatus: "closed",
      title: "No payment captured",
      message: "Cancelling now releases the dates. Because no payment has been submitted or approved, there is no refund to process.",
      refundLabel: "No refund needed",
      paidAmount: 0,
      refundPercent: 0,
      hoursUntilCheckIn,
    });
  }

  if (booking.paymentStatus === "submitted" || payment?.paymentStatus === "submitted") {
    const paymentReceivedAt = getPaymentReceivedDate({ booking, payment }).toISOString();
    return buildPolicy({
      outcome: "payment_review",
      cancellationStatus: "review",
      title: "Payment proof needs review",
      message: "Cancelling releases the dates, and support will verify whether the submitted payment was received before closing or refunding it.",
      refundLabel: "Payment verification review",
      paidAmount: paidAmountForPolicy(booking, payment),
      refundPercent: 0,
      paymentReceivedAt,
      hoursUntilCheckIn,
    });
  }

  const paymentReceivedDate = getPaymentReceivedDate({ booking, payment });
  const paymentReceivedAt = paymentReceivedDate.toISOString();
  const elapsed = Math.max(now.getTime() - paymentReceivedDate.getTime(), 0);
  const hoursSincePayment = elapsed / HOUR_MS;
  const paidAmount = paidAmountForPolicy(booking, payment);

  if (hoursUntilCheckIn <= 48) {
    return buildPolicy({
      outcome: "no_refund",
      cancellationStatus: "review",
      title: "No refund recommended",
      message: "This is within 48 hours of check-in. The dates will be released, but the paid amount should be reviewed as no refund by default unless support approves an exception.",
      refundLabel: "No refund recommended",
      paidAmount,
      refundPercent: 0,
      paymentReceivedAt,
      hoursSincePayment,
      hoursUntilCheckIn,
    });
  }

  if (elapsed <= DAY_MS) {
    return buildPolicy({
      outcome: "full_refund",
      cancellationStatus: "review",
      title: "Full refund review",
      message: "This cancellation is within 24 hours of payment and still before the final check-in window, so the paid amount is recommended for full refund review.",
      refundLabel: "Full refund review",
      paidAmount,
      refundPercent: 1,
      paymentReceivedAt,
      hoursSincePayment,
      hoursUntilCheckIn,
    });
  }

  if (elapsed <= 2 * DAY_MS && hoursUntilCheckIn >= 7 * 24) {
    return buildPolicy({
      outcome: "full_refund",
      cancellationStatus: "review",
      title: "Full refund review",
      message: "This is just after the first day and still at least 7 days before check-in, so the paid amount is recommended for full refund review.",
      refundLabel: "Full refund review",
      paidAmount,
      refundPercent: 1,
      paymentReceivedAt,
      hoursSincePayment,
      hoursUntilCheckIn,
    });
  }

  if (elapsed <= 4 * DAY_MS && hoursUntilCheckIn >= 72) {
    return buildPolicy({
      outcome: "partial_refund",
      cancellationStatus: "review",
      title: "Partial refund review",
      message: "This is 2 to 3 days after payment and still more than 72 hours before check-in, so 50% of the paid amount is recommended for refund review.",
      refundLabel: "50% refund review",
      paidAmount,
      refundPercent: 0.5,
      paymentReceivedAt,
      hoursSincePayment,
      hoursUntilCheckIn,
    });
  }

  if (elapsed <= 5 * DAY_MS) {
    return buildPolicy({
      outcome: "manual_review",
      cancellationStatus: "review",
      title: "Manual refund review",
      message: "This is 4 to 5 days after payment. The dates will be released, and support should review host impact, check-in timing, and any exception before deciding the refund.",
      refundLabel: "Manual refund review",
      paidAmount,
      refundPercent: 0,
      paymentReceivedAt,
      hoursSincePayment,
      hoursUntilCheckIn,
    });
  }

  return buildPolicy({
    outcome: "no_refund",
    cancellationStatus: "review",
    title: "No refund recommended",
    message: "This cancellation is more than 5 days after payment. The dates will be released, but no refund is recommended by default unless support approves an exception.",
    refundLabel: "No refund recommended",
    paidAmount,
    refundPercent: 0,
    paymentReceivedAt,
    hoursSincePayment,
    hoursUntilCheckIn,
  });
}
