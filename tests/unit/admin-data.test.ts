import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, Property } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/repositories", () => ({
  usesPrismaPersistence: () => false,
  getAdminDashboardSummaryFromDatabase: vi.fn(),
  listPaymentsFromDatabase: vi.fn(),
  listPlatformLedgerFromDatabase: vi.fn(),
  listReviewsFromDatabase: vi.fn(),
}));
vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(),
}));
vi.mock("@/lib/cancellation-store", () => ({
  readStoredCancellations: vi.fn(),
}));
vi.mock("@/lib/payment-store", () => ({
  readStoredPayments: vi.fn(),
}));
vi.mock("@/lib/platform-ledger-store", () => ({
  readStoredPlatformLedger: vi.fn(),
}));
vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(),
}));
vi.mock("@/lib/review-store", () => ({
  readStoredReviews: vi.fn(),
}));

import { readStoredBookings } from "@/lib/booking-store";
import { getAdminDashboardSummary } from "@/lib/admin-data";
import { readStoredProperties } from "@/lib/property-store";

function propertyWithStatus(id: string, status: Property["status"]): Property {
  return {
    id,
    hostId: "host-1",
    slug: id,
    title: id,
    description: "Sample listing",
    address: "Sample address",
    city: "Tagaytay",
    country: "Philippines",
    pricePerNight: 5000,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    propertyType: "Condo",
    status,
    rating: 0,
    amenities: [],
    rules: [],
    createdAt: "2026-06-01",
    images: [],
  };
}

function bookingWithTotal(id: string, totalPrice: number, status: Booking["status"]): Booking {
  return {
    id,
    propertyId: "property-1",
    guestId: "guest-1",
    hostId: "host-1",
    checkIn: "2026-06-20",
    checkOut: "2026-06-22",
    guests: 2,
    totalPrice,
    status,
    paymentStatus: "pending",
    createdAt: "2026-06-01",
  };
}

describe("getAdminDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes the StayPrimePH earnings value from gross booking value", async () => {
    vi.mocked(readStoredProperties).mockResolvedValue([
      propertyWithStatus("pending-listing", "pending"),
      propertyWithStatus("approved-listing", "approved"),
    ]);
    vi.mocked(readStoredBookings).mockResolvedValue([
      bookingWithTotal("booking-1", 12000, "pending"),
      bookingWithTotal("booking-2", 6000, "confirmed"),
    ]);

    const summary = await getAdminDashboardSummary();

    expect(summary).toMatchObject({
      pendingListings: 1,
      approvedListings: 1,
      openBookings: 1,
      grossBookingValue: 18000,
      stayprimeEarningsValue: 3000,
    });
  });
});
