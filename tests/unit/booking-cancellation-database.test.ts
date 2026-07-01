import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => true,
  cancelBookingInDatabase: vi.fn(),
  listBookingsForGuestFromDatabase: vi.fn(),
  listBookingsForHostFromDatabase: vi.fn(),
  listBookingsForPropertyFromDatabase: vi.fn(),
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

import { cancelBookingByGuest } from "@/lib/bookings";
import { cancelBookingInDatabase } from "@/lib/repositories";

const confirmedBooking = {
  id: "booking-confirmed-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-07-20",
  checkOut: "2026-07-22",
  guests: 2,
  totalPrice: 5000,
  status: "confirmed",
  paymentStatus: "paid",
  createdAt: "2026-06-20",
} satisfies Booking;

describe("cancelBookingByGuest with Prisma persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels a confirmed paid booking with refund review metadata", async () => {
    const cancellation = await cancelBookingByGuest(confirmedBooking, "Plans changed", {
      status: "review",
      policySummary: "Policy: Full refund review",
      policyOutcome: "full_refund",
      refundPercent: 1,
      refundAmount: 5000,
      paidAmount: 5000,
    });

    expect(cancellation).toMatchObject({
      bookingId: confirmedBooking.id,
      propertyId: confirmedBooking.propertyId,
      status: "review",
    });
    expect(cancelBookingInDatabase).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: confirmedBooking.id,
      propertyId: confirmedBooking.propertyId,
      actorId: confirmedBooking.guestId,
      actorRole: "guest",
      paymentStatus: "paid",
      policyOutcome: "full_refund",
      refundPercent: 1,
      refundAmount: 5000,
      paidAmount: 5000,
    }));
  });
});
