import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingPackage, Property, User } from "@/lib/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  assertTrustedRequestOrigin: vi.fn(),
  assertValidCsrfForm: vi.fn(),
  createAvailabilityBlocks: vi.fn(),
  deleteAvailabilityBlock: vi.fn(),
  getAvailabilityBlocks: vi.fn(async () => []),
  getBlockedDateKeys: vi.fn((): string[] => []),
  getBookings: vi.fn(async () => []),
  getPropertyById: vi.fn(),
  hasAvailabilityBlockConflict: vi.fn(() => false),
  hasDateConflict: vi.fn(() => false),
  readStoredProperties: vi.fn(),
  revalidatePath: vi.fn(),
  revalidatePublicListingSummaries: vi.fn(),
  revalidateTag: vi.fn(),
  requireRole: vi.fn(),
  requireVerifiedEmail: vi.fn(),
  saveListingRateAdjustments: vi.fn(),
  updatePropertyDetailsInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
  writeStoredProperties: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock("@/lib/auth", () => ({
  requireRole: mocks.requireRole,
  requireVerifiedEmail: mocks.requireVerifiedEmail,
}));

vi.mock("@/lib/availability", () => ({
  createAvailabilityBlocks: mocks.createAvailabilityBlocks,
  deleteAvailabilityBlock: mocks.deleteAvailabilityBlock,
  getAvailabilityBlocks: mocks.getAvailabilityBlocks,
}));

vi.mock("@/lib/availability-calendar", () => ({
  getBlockedDateKeys: mocks.getBlockedDateKeys,
  hasAvailabilityBlockConflict: mocks.hasAvailabilityBlockConflict,
}));

vi.mock("@/lib/bookings", () => ({
  getBookings: mocks.getBookings,
  hasDateConflict: mocks.hasDateConflict,
}));

vi.mock("@/lib/csrf", () => ({
  assertValidCsrfForm: mocks.assertValidCsrfForm,
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: mocks.getPropertyById,
  revalidatePublicListingSummaries: mocks.revalidatePublicListingSummaries,
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: mocks.readStoredProperties,
  writeStoredProperties: mocks.writeStoredProperties,
}));

vi.mock("@/lib/rate-adjustments", () => ({
  saveListingRateAdjustments: mocks.saveListingRateAdjustments,
}));

vi.mock("@/lib/repositories", () => ({
  updatePropertyDetailsInDatabase: mocks.updatePropertyDetailsInDatabase,
  usesPrismaPersistence: mocks.usesPrismaPersistence,
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: mocks.assertTrustedRequestOrigin,
}));

import { blockHostAvailability, saveBookingPackageRates } from "@/app/host/calendar/actions";

const host: User = {
  id: "host-1",
  name: "Host",
  email: "host@example.test",
  role: "host",
  avatar: "",
  phone: "",
  createdAt: "2026-06-01",
  emailVerifiedAt: "2026-06-01T00:00:00.000Z",
};

function bookingPackage(overrides: Partial<BookingPackage> = {}): BookingPackage {
  return {
    id: "overnight-whole-villa",
    name: "Overnight - Whole Villa",
    status: "active",
    displayOrder: 1,
    accessType: "Whole villa",
    unit: "night",
    weekdayRate: 15000,
    weekendRate: 18000,
    holidayRate: 18000,
    includedGuests: 16,
    maxGuests: 40,
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
    id: "caya-listing",
    hostId: host.id,
    slug: "the-caya",
    title: "The Caya",
    description: "A stay",
    address: "Iyam",
    city: "Lucena",
    country: "Philippines",
    pricePerNight: 15000,
    bedrooms: 4,
    bathrooms: 5,
    maxGuests: 40,
    propertyType: "private_resort",
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

function packageRatesForm(input: { propertyId: string; packageId: string; weekdayRate: string; weekendRate: string; holidayRate: string }) {
  const formData = new FormData();
  formData.set("csrfToken", "csrf-token");
  formData.set("propertyId", input.propertyId);
  formData.set("packageId", input.packageId);
  formData.set("weekdayRate", input.weekdayRate);
  formData.set("weekendRate", input.weekendRate);
  formData.set("holidayRate", input.holidayRate);
  return formData;
}

function availabilityForm(input: { propertyId: string; checkIn: string; checkOut: string; reason: string; note?: string }) {
  const formData = new FormData();
  formData.set("csrfToken", "csrf-token");
  formData.set("propertyId", input.propertyId);
  formData.set("checkIn", input.checkIn);
  formData.set("checkOut", input.checkOut);
  formData.set("reason", input.reason);
  if (input.note) formData.set("note", input.note);
  return formData;
}

describe("blockHostAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(host);
    mocks.getBookings.mockResolvedValue([]);
    mocks.getAvailabilityBlocks.mockResolvedValue([]);
    mocks.getBlockedDateKeys.mockReturnValue(["2026-07-04"]);
    mocks.hasDateConflict.mockReturnValue(false);
    mocks.hasAvailabilityBlockConflict.mockReturnValue(false);
  });

  it("saves booked by guest as an unavailable reason", async () => {
    const caya = property();
    mocks.getPropertyById.mockResolvedValue(caya);

    const result = await blockHostAvailability(
      { status: "idle", message: "" },
      availabilityForm({
        propertyId: caya.id,
        checkIn: "2026-07-04",
        checkOut: "2026-07-05",
        reason: "booked_by_guest",
        note: "Walk-in guest",
      }),
    );

    expect(result).toEqual({ status: "success", message: "1 night marked unavailable." });
    expect(mocks.createAvailabilityBlocks).toHaveBeenCalledWith([
      expect.objectContaining({
        propertyId: caya.id,
        date: "2026-07-04",
        reason: "booked_by_guest",
        note: "Walk-in guest",
      }),
    ]);
  });
});

describe("saveBookingPackageRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(host);
    mocks.usesPrismaPersistence.mockReturnValue(false);
  });

  it("updates the selected active booking package rates", async () => {
    const overnight = bookingPackage();
    const daytime = bookingPackage({
      id: "daytime-ground-floor",
      name: "Daytime - Ground Floor - No Room",
      displayOrder: 2,
      unit: "day",
      weekdayRate: 8000,
      weekendRate: 0,
      holidayRate: 0,
    });
    const caya = property({ bookingPackages: [overnight, daytime] });
    const otherListing = property({ id: "other-listing", slug: "other", title: "Other listing" });
    mocks.getPropertyById.mockResolvedValue(caya);
    mocks.readStoredProperties.mockResolvedValue([caya, otherListing]);

    const result = await saveBookingPackageRates(
      { status: "idle", message: "" },
      packageRatesForm({
        propertyId: caya.id,
        packageId: overnight.id,
        weekdayRate: "16000",
        weekendRate: "19000",
        holidayRate: "20000",
      }),
    );

    expect(result).toEqual({ status: "success", message: "Overnight - Whole Villa package prices saved." });
    expect(mocks.writeStoredProperties).toHaveBeenCalledTimes(1);
    const savedProperties = mocks.writeStoredProperties.mock.calls[0]?.[0] as Property[];
    const savedCaya = savedProperties.find((item) => item.id === caya.id);
    expect(savedCaya?.bookingPackages).toEqual([
      expect.objectContaining({ id: overnight.id, weekdayRate: 16000, weekendRate: 19000, holidayRate: 20000 }),
      daytime,
    ]);
    expect(savedProperties.find((item) => item.id === otherListing.id)).toEqual(otherListing);
    expect(mocks.revalidatePublicListingSummaries).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/host/calendar");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/rooms/caya-listing");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/property/the-caya");
  });

  it("rejects inactive packages", async () => {
    const inactive = bookingPackage({ id: "old-package", status: "inactive" });
    const caya = property({ bookingPackages: [inactive] });
    mocks.getPropertyById.mockResolvedValue(caya);

    const result = await saveBookingPackageRates(
      { status: "idle", message: "" },
      packageRatesForm({
        propertyId: caya.id,
        packageId: inactive.id,
        weekdayRate: "16000",
        weekendRate: "19000",
        holidayRate: "20000",
      }),
    );

    expect(result).toEqual({ status: "error", message: "Choose an active booking package for this listing." });
    expect(mocks.writeStoredProperties).not.toHaveBeenCalled();
    expect(mocks.updatePropertyDetailsInDatabase).not.toHaveBeenCalled();
  });
});
