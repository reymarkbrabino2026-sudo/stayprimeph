import { describe, expect, it } from "vitest";
import { evaluateCancellationPolicy } from "@/lib/cancellation-policy";
import type { Booking, Payment } from "@/lib/types";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-15",
  checkOut: "2026-07-17",
  guests: 2,
  totalPrice: 12000,
  status: "confirmed",
  paymentStatus: "paid",
  createdAt: "2026-06-20T08:00:00.000Z",
} satisfies Booking;

const payment = {
  id: "payment-1",
  bookingId: booking.id,
  guestId: booking.guestId,
  hostId: booking.hostId,
  amount: booking.totalPrice,
  paymentMethod: "gcash",
  paymentStatus: "paid",
  transactionId: "GCASH-123",
  confirmedAt: "2026-06-20T10:00:00.000Z",
  submittedAt: "2026-06-20T09:30:00.000Z",
  createdAt: "2026-06-20T09:00:00.000Z",
} satisfies Payment;

describe("evaluateCancellationPolicy", () => {
  it("closes unpaid cancellations without refund work", () => {
    const policy = evaluateCancellationPolicy({
      booking: { ...booking, paymentStatus: "pending" },
      payment: null,
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "no_payment",
      cancellationStatus: "closed",
      refundLabel: "No refund needed",
      refundAmount: 0,
    });
  });

  it("sends submitted payment proof to review", () => {
    const policy = evaluateCancellationPolicy({
      booking: { ...booking, paymentStatus: "submitted" },
      payment: { ...payment, paymentStatus: "submitted", amount: 6000 },
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "payment_review",
      cancellationStatus: "review",
      paidAmount: 6000,
      refundAmount: 0,
    });
  });

  it("recommends a full refund within 24 hours of payment", () => {
    const policy = evaluateCancellationPolicy({
      booking,
      payment,
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "full_refund",
      cancellationStatus: "review",
      refundPercent: 1,
      refundAmount: booking.totalPrice,
    });
  });

  it("recommends a partial refund after two to three days when check-in is not imminent", () => {
    const policy = evaluateCancellationPolicy({
      booking,
      payment,
      now: new Date("2026-06-23T12:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "partial_refund",
      cancellationStatus: "review",
      refundPercent: 0.5,
      refundAmount: 6000,
    });
  });

  it("keeps four to five day cancellations in manual review", () => {
    const policy = evaluateCancellationPolicy({
      booking,
      payment,
      now: new Date("2026-06-25T10:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "manual_review",
      cancellationStatus: "review",
      refundLabel: "Manual refund review",
    });
  });

  it("applies the recommendation to the paid partial amount", () => {
    const policy = evaluateCancellationPolicy({
      booking: { ...booking, paymentStatus: "partially_paid" },
      payment: { ...payment, paymentStatus: "partially_paid", amount: 6000 },
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(policy).toMatchObject({
      outcome: "full_refund",
      paidAmount: 6000,
      refundAmount: 6000,
    });
  });
});
