import { describe, expect, it } from "vitest";
import { getListingMarkers } from "@/lib/search-map";
import type { Property } from "@/lib/types";

function property(overrides: Partial<Property>): Property {
  return {
    id: "listing-1",
    hostId: "host-1",
    slug: "test-listing",
    title: "Test listing",
    description: "A place to stay",
    address: "1 Test Street, Mamacao",
    city: "Sta Maria",
    country: "Philippines",
    barangay: "Mamacao",
    province: "Davao Occidental",
    zipCode: "8011",
    pricePerNight: 6100,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    propertyType: "House",
    status: "approved",
    rating: 0,
    amenities: [],
    rules: [],
    createdAt: "2026-06-01",
    images: [],
    ...overrides,
  };
}

describe("search map markers", () => {
  it("uses the host-pinned listing coordinates exactly", () => {
    const markers = getListingMarkers([
      property({ id: "exact-1", latitude: 6.5801, longitude: 125.4574 }),
      property({ id: "exact-2", latitude: 6.5801, longitude: 125.4574 }),
    ]);

    expect(markers[0]).toMatchObject({ coords: [6.5801, 125.4574], exact: true });
    expect(markers[1]).toMatchObject({ coords: [6.5801, 125.4574], exact: true });
  });

  it("only offsets generated fallback coordinates", () => {
    const markers = getListingMarkers([
      property({ id: "fallback-1", latitude: undefined, longitude: undefined }),
      property({ id: "fallback-2", latitude: undefined, longitude: undefined }),
    ]);

    expect(markers[0]).toMatchObject({ coords: [6.5801, 125.4574], exact: false });
    expect(markers[1].coords).not.toEqual([6.5801, 125.4574]);
  });
});
