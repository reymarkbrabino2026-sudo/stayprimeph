import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, Cancellation, Payment } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  listCancellationsFromDatabase: vi.fn(),
  resolveCancellationReviewInDatabase: vi.fn(),
}));
vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(),
  writeStoredBookings: vi.fn(),
}));
vi.mock("@/lib/cancellation-store", () => ({
  readStoredCancellations: vi.fn(),
  writeStoredCancellations: vi.fn(),
}));
vi.mock("@/lib/payment-store", () => ({
  readStoredPayments: vi.fn(),
  writeStoredPayments: vi.fn(),
}));

import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { appendAuditLog } from "@/lib/audit-logs";
import { resolveCancellationReview } from "@/lib/cancellations";
import { readStoredCancellations, writeStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-10",
  checkOut: "2026-07-12",
  guests: 2,
  totalPrice: 5000,
  status: "cancelled",
  paymentStatus: "paid",
  createdAt: "2026-06-18",
} satisfies Booking;

const cancellation = {
  id: "cancellation-1",
  bookingId: booking.id,
  propertyId: booking.propertyId,
  reason: "Plans changed",
  status: "review",
  createdAt: "2026-06-18T00:00:00.000Z",
} satisfies Cancellation;

const payment = {
  id: "payment-booking-1",
  bookingId: booking.id,
  guestId: booking.guestId,
  hostId: booking.hostId,
  amount: booking.totalPrice,
  paymentMethod: "stripe",
  paymentStatus: "paid",
  transactionId: "pi_test_123",
  createdAt: "2026-06-18T00:00:00.000Z",
} satisfies Payment;

describe("resolveCancellationReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);
    vi.mocked(readStoredCancellations).mockResolvedValue([cancellation]);
    vi.mocked(readStoredPayments).mockResolvedValue([payment]);
  });

  it("marks a reviewed cancellation as refunded and updates payment state", async () => {
    await resolveCancellationReview({ bookingId: booking.id, resolution: "refund", adminId: "admin-1" });

    expect(writeStoredCancellations).toHaveBeenCalledWith([
      expect.objectContaining({ bookingId: booking.id, status: "refunded" }),
    ]);
    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({ id: booking.id, status: "cancelled", paymentStatus: "refunded" }),
    ]);
    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({ bookingId: booking.id, paymentStatus: "refunded" }),
    ]);
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "payment.refunded",
      entityType: "payment",
      entityId: payment.id,
    }));
  });

  it("closes a submitted-payment cancellation without refund by rejecting the payment", async () => {
    vi.mocked(readStoredBookings).mockResolvedValue([{ ...booking, paymentStatus: "submitted" }]);
    vi.mocked(readStoredPayments).mockResolvedValue([{ ...payment, paymentMethod: "gcash", paymentStatus: "submitted" }]);

    await resolveCancellationReview({ bookingId: booking.id, resolution: "no_refund", adminId: "admin-1" });

    expect(writeStoredCancellations).toHaveBeenCalledWith([
      expect.objectContaining({ bookingId: booking.id, status: "closed" }),
    ]);
    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({ id: booking.id, paymentStatus: "rejected" }),
    ]);
    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        paymentStatus: "rejected",
        rejectionReason: "Cancellation closed without refund.",
      }),
    ]);
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      actorRole: "admin",
      action: "payment.rejected",
      entityType: "payment",
      entityId: payment.id,
      metadata: expect.objectContaining({ cancellationResolution: "no_refund" }),
    }));
  });

  it("rejects resolution when no cancellation is waiting for review", async () => {
    vi.mocked(readStoredCancellations).mockResolvedValue([{ ...cancellation, status: "closed" }]);

    await expect(resolveCancellationReview({ bookingId: booking.id, resolution: "refund", adminId: "admin-1" })).rejects.toThrow(
      "No cancellation is waiting for admin review.",
    );

    expect(writeStoredCancellations).not.toHaveBeenCalled();
    expect(writeStoredBookings).not.toHaveBeenCalled();
    expect(writeStoredPayments).not.toHaveBeenCalled();
    expect(appendAuditLog).not.toHaveBeenCalled();
  });
});
