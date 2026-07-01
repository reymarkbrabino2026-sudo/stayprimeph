import { describe, expect, it } from "vitest";
import { isPaidAvailabilityBlockReason, paidAvailabilityBlocksForProperties } from "@/lib/paid-availability-blocks";
import type { AvailabilityBlock, BookingPackage, Property } from "@/lib/types";

function bookingPackage(overrides: Partial<BookingPackage> = {}): BookingPackage {
  return {
    id: "overnight-whole-villa",
    name: "Overnight - Whole Villa",
    accessType: "Whole villa",
    unit: "night",
    weekdayRate: 10000,
    weekendRate: 12000,
    includedGuests: 12,
    maxGuests: 24,
    additionalGuestFee: 0,
    extensionHourlyFee: 0,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    enabled: true,
    ...overrides,
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: "caya",
    hostId: "host-1",
    slug: "the-caya",
    title: "The Caya",
    description: "Sample listing",
    address: "Sample address",
    city: "Lucena",
    country: "Philippines",
    pricePerNight: 8333,
    weekendPrice: 8333,
    bedrooms: 4,
    bathrooms: 5,
    maxGuests: 24,
    propertyType: "Private resort",
    status: "approved",
    rating: 0,
    amenities: [],
    rules: [],
    createdAt: "2026-06-01",
    images: [],
    bookingPackages: [bookingPackage()],
    ...overrides,
  };
}

function availabilityBlock(overrides: Partial<AvailabilityBlock> = {}): AvailabilityBlock {
  return {
    id: "block-1",
    propertyId: "caya",
    date: "2026-07-01",
    reason: "booked_by_guest",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("paidAvailabilityBlocksForProperties", () => {
  it("includes only paid blocked-date reasons", () => {
    expect(isPaidAvailabilityBlockReason("booked_by_guest")).toBe(true);
    expect(isPaidAvailabilityBlockReason("booked_elsewhere")).toBe(true);
    expect(isPaidAvailabilityBlockReason("owner_use")).toBe(false);
  });

  it("uses the selected package price and active discount for paid blocked dates", () => {
    const blocks = paidAvailabilityBlocksForProperties([
      availabilityBlock({ bookingPackageId: "overnight-whole-villa" }),
      availabilityBlock({ id: "owner-use", reason: "owner_use" }),
    ], [
      property({
        rateAdjustments: [{
          id: "promo",
          type: "discount",
          name: "July promo",
          startDate: "2026-07-01",
          endDate: "2026-07-01",
          active: true,
          discountPercent: 10,
        }],
      }),
    ]);

    expect(blocks).toEqual([
      expect.objectContaining({
        bookingPackageName: "Overnight - Whole Villa",
        propertyTitle: "The Caya",
        reasonLabel: "Booked by guest",
        totalPrice: 9000,
      }),
    ]);
  });
});
