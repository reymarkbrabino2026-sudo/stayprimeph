import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { STRIPE_SECRET_KEY: undefined } }));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  listPaymentsFromDatabase: vi.fn(),
  recordManualPaymentInDatabase: vi.fn(),
  confirmManualPaymentInDatabase: vi.fn(),
  rejectManualPaymentInDatabase: vi.fn(),
}));
vi.mock("@/lib/payment-store", () => ({
  readStoredPayments: vi.fn(async () => []),
  writeStoredPayments: vi.fn(),
}));
vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(async () => []),
  writeStoredBookings: vi.fn(),
}));

import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { submitManualPayment } from "@/lib/payments";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-06-10",
  checkOut: "2026-06-12",
  guests: 2,
  totalPrice: 5000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: "2026-06-01",
} satisfies Booking;

describe("submitManualPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects manual payments that do not match the booking total", async () => {
    await expect(
      submitManualPayment({
        guestId: "guest-1",
        booking,
        paymentInput: {
          bookingId: booking.id,
          paymentMethod: "gcash",
          amount: 1000,
          transactionId: "lower-than-total",
          notes: undefined,
        },
      }),
    ).rejects.toThrow("Payment amount must match the booking total.");

    expect(readStoredPayments).not.toHaveBeenCalled();
    expect(writeStoredPayments).not.toHaveBeenCalled();
    expect(readStoredBookings).not.toHaveBeenCalled();
    expect(writeStoredBookings).not.toHaveBeenCalled();
  });
});
