import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { PERSISTENCE_DRIVER: "json" } }));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  cancelBookingInDatabase: vi.fn(),
  listBookingsFromDatabase: vi.fn(),
  updateBookingPaymentInDatabase: vi.fn(),
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
vi.mock("@/lib/platform-ledger-store", () => ({
  readStoredPlatformLedger: vi.fn(async () => []),
  writeStoredPlatformLedger: vi.fn(),
}));

import { readStoredBookings, writeStoredBookings } from "@/lib/booking-store";
import { cancelBookingByGuest, markBookingPaid } from "@/lib/bookings";
import { readStoredCancellations, writeStoredCancellations } from "@/lib/cancellation-store";
import { readStoredPayments, writeStoredPayments } from "@/lib/payment-store";
import { writeStoredPlatformLedger } from "@/lib/platform-ledger-store";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-06-20",
  checkOut: "2026-06-22",
  guests: 2,
  totalPrice: 5000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: "2026-06-01",
} satisfies Booking;

describe("cancelBookingByGuest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);
    vi.mocked(readStoredCancellations).mockResolvedValue([]);
  });

  it("cancels the booking and records a closed cancellation for unpaid bookings", async () => {
    const cancellation = await cancelBookingByGuest(booking, "Plans changed");

    expect(cancellation).toMatchObject({
      bookingId: booking.id,
      propertyId: booking.propertyId,
      reason: "Plans changed",
      status: "closed",
    });
    expect(writeStoredBookings).toHaveBeenCalledWith([{ ...booking, status: "cancelled" }]);
    expect(writeStoredCancellations).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        reason: "Plans changed",
        status: "closed",
      }),
    ]);
  });
});

describe("markBookingPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readStoredBookings).mockResolvedValue([booking]);
    vi.mocked(readStoredPayments).mockResolvedValue([]);
  });

  it("confirms the booking only after provider payment is recorded", async () => {
    await markBookingPaid(booking.id, "pi_stripe_123");

    expect(writeStoredBookings).toHaveBeenCalledWith([
      expect.objectContaining({
        id: booking.id,
        status: "confirmed",
        paymentStatus: "paid",
      }),
    ]);
    expect(writeStoredPayments).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        paymentMethod: "stripe",
        paymentStatus: "paid",
        transactionId: "pi_stripe_123",
      }),
    ]);
    expect(writeStoredPlatformLedger).toHaveBeenCalledWith([
      expect.objectContaining({
        bookingId: booking.id,
        source: "stripe",
        status: "banked",
      }),
    ]);
  });
});
