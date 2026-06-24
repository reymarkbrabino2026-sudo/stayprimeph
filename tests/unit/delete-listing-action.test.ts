import { afterEach, describe, expect, test, vi } from "vitest";
import type { Booking, Property, User } from "@/lib/types";

vi.mock("server-only", () => ({}));

const hostUser: User = {
  id: "host-1",
  name: "Host One",
  email: "host@example.test",
  role: "host",
  avatar: "HO",
  phone: "",
  createdAt: "2026-06-24",
  emailVerifiedAt: "2026-06-24T00:00:00.000Z",
};

const property: Property = {
  id: "listing-1",
  hostId: hostUser.id,
  slug: "listing-1",
  title: "Protected listing",
  description: "A listing with active bookings",
  address: "123 Street",
  city: "Sta Maria",
  country: "Philippines",
  pricePerNight: 36000,
  bedrooms: 2,
  bathrooms: 1,
  maxGuests: 4,
  propertyType: "House",
  status: "approved",
  rating: 0,
  amenities: [],
  rules: [],
  createdAt: "2026-06-24",
  images: [],
};

const booking: Booking = {
  id: "booking-1",
  propertyId: property.id,
  guestId: "guest-1",
  hostId: hostUser.id,
  checkIn: "2026-07-08",
  checkOut: "2026-07-10",
  guests: 1,
  totalPrice: 36000,
  status: "confirmed",
  paymentStatus: "submitted",
  createdAt: "2026-06-24",
};

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => hostUser),
  requireVerifiedEmail: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  assertValidCsrfForm: vi.fn(),
  assertValidCsrfToken: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {},
}));

vi.mock("@/lib/host-wizard-data", () => ({
  amenityGroups: [],
}));

vi.mock("@/lib/host-wizard-schema", () => ({
  hostListingSchema: { safeParse: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/pricing", () => ({
  calculateDefaultWeekendPrice: vi.fn((price: number) => price),
}));

vi.mock("@/lib/request-safety", () => ({
  assertTrustedRequestOrigin: vi.fn(),
}));

vi.mock("@/lib/upload-paths", () => ({
  isIntendedListingPhotoUrl: vi.fn(() => true),
}));

vi.mock("@/lib/repositories", () => ({
  createPropertyInDatabase: vi.fn(),
  deleteDraftPropertyInDatabase: vi.fn(),
  deletePropertyInDatabase: vi.fn(),
  updatePropertyDetailsInDatabase: vi.fn(),
  upsertDraftPropertyInDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/properties", () => ({
  getPropertyById: vi.fn(async () => property),
  revalidatePublicListingSummaries: vi.fn(),
}));

vi.mock("@/lib/booking-store", () => ({
  readStoredBookings: vi.fn(async () => [booking]),
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(async () => [property]),
  writeStoredProperties: vi.fn(),
}));

import { deleteListing } from "@/app/host/listings/actions";
import { writeStoredProperties } from "@/lib/property-store";

afterEach(() => {
  vi.clearAllMocks();
});

describe("deleteListing", () => {
  test("returns a friendly error without deleting a listing that has an active booking", async () => {
    const formData = new FormData();
    formData.set("id", property.id);
    formData.set("csrfToken", "csrf-token");

    await expect(deleteListing(formData)).resolves.toEqual({
      status: "error",
      error: "This listing has active bookings and cannot be deleted. Please resolve those bookings before deleting the listing.",
    });
    expect(writeStoredProperties).not.toHaveBeenCalled();
  });
});
