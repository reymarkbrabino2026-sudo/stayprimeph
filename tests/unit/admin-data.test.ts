import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityBlock, Booking, Property } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (callback: unknown) => callback,
}));
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
vi.mock("@/lib/availability-store", () => ({
  readStoredAvailabilityBlocks: vi.fn(),
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

import { getAdminDashboardSummary } from "@/lib/admin-data";
import { readStoredAvailabilityBlocks } from "@/lib/availability-store";
import { readStoredBookings } from "@/lib/booking-store";
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
    weekendPrice: 5000,
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

function availabilityBlock(id: string, reason: AvailabilityBlock["reason"]): AvailabilityBlock {
  return {
    id,
    propertyId: "approved-listing",
    date: "2099-07-15",
    reason,
    createdAt: "2026-06-01T00:00:00.000Z",
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
    vi.mocked(readStoredAvailabilityBlocks).mockResolvedValue([
      availabilityBlock("external-1", "booked_by_guest"),
      availabilityBlock("owner-1", "owner_use"),
    ]);

    const summary = await getAdminDashboardSummary();

    expect(summary).toMatchObject({
      pendingListings: 1,
      approvedListings: 1,
      openBookings: 2,
      grossBookingValue: 23000,
      stayprimeEarningsValue: 3000,
      externalPaidBlocks: 1,
      externalPaidValue: 5000,
    });
  });
});
