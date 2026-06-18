import type { Payment } from "@/lib/types";

export const duplicatePaymentReferenceMessage = "Payment reference has already been used.";

function normalizeReference(value: string) {
  return value.trim();
}

export function hasDuplicatePaymentReference(
  payments: Payment[],
  {
    bookingId,
    paymentMethod,
    transactionId,
  }: {
    bookingId: string;
    paymentMethod: string;
    transactionId: string;
  },
) {
  const reference = normalizeReference(transactionId);
  const method = paymentMethod.trim();
  return payments.some((payment) => (
    payment.bookingId !== bookingId &&
    payment.paymentMethod.trim() === method &&
    normalizeReference(payment.transactionId) === reference
  ));
}

export function assertUniquePaymentReference(
  payments: Payment[],
  details: {
    bookingId: string;
    paymentMethod: string;
    transactionId: string;
  },
) {
  if (hasDuplicatePaymentReference(payments, details)) {
    throw new Error(duplicatePaymentReferenceMessage);
  }
}
