import { describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit-logs", () => ({
  appendAuditLog: vi.fn(),
}));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
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

import { hasDateConflict, isExpiredUnpaidBooking } from "@/lib/bookings";

const booking = {
  id: "booking-1",
  propertyId: "property-1",
  guestId: "guest-1",
  hostId: "host-1",
  checkIn: "2026-06-22",
  checkOut: "2026-06-23",
  guests: 1,
  totalPrice: 18000,
  status: "pending",
  paymentStatus: "pending",
  createdAt: "2026-06-20",
} satisfies Booking;

describe("expired unpaid bookings", () => {
  const today = new Date("2026-06-24T00:00:00.000Z");

  it("marks unpaid requests expired after the check-in date passes", () => {
    expect(isExpiredUnpaidBooking(booking, today)).toBe(true);
    expect(isExpiredUnpaidBooking({ ...booking, paymentStatus: "submitted" }, today)).toBe(false);
    expect(isExpiredUnpaidBooking({ ...booking, paymentStatus: "paid" }, today)).toBe(false);
  });

  it("does not let expired unpaid requests block the same dates", () => {
    expect(hasDateConflict([booking], booking.propertyId, "2026-06-22", "2026-06-23")).toBe(false);
    expect(hasDateConflict([
      { ...booking, paymentStatus: "submitted" },
    ], booking.propertyId, "2026-06-22", "2026-06-23")).toBe(true);
  });
});
