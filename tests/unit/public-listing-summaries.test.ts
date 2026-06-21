import { describe, expect, it, vi } from "vitest";
import type { Property } from "@/lib/types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (callback: unknown) => callback,
}));

vi.mock("@/lib/repositories", () => ({
  findPropertyByIdFromDatabase: vi.fn(),
  listPropertiesFromDatabase: vi.fn(),
  listPublicListingSummariesFromDatabase: vi.fn(),
  usesPrismaPersistence: vi.fn(() => false),
}));

vi.mock("@/lib/property-store", () => ({
  readStoredProperties: vi.fn(),
}));

import { getPublicListingSummaries } from "@/lib/properties";
import { readStoredProperties } from "@/lib/property-store";

function property(overrides: Partial<Property>): Property {
  return {
    id: "listing-1",
    hostId: "host-1",
    slug: "test-listing",
    title: "Test listing",
    description: "A place to stay",
    address: "1 Test Street",
    city: "Baguio",
    country: "Philippines",
    pricePerNight: 6100,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    propertyType: "House",
    status: "approved",
    rating: 4.9,
    amenities: ["Kitchen"],
    rules: ["No smoking"],
    createdAt: "2026-06-01",
    images: [
      { id: "image-1", propertyId: "listing-1", imageUrl: "/uploads/listings/photo-1.webp", tone: "from-rose-100 via-orange-50 to-stone-100" },
      { id: "image-2", propertyId: "listing-1", imageUrl: "/uploads/listings/photo-2.webp", tone: "from-blue-100 via-sky-50 to-stone-100" },
    ],
    ...overrides,
  };
}

describe("getPublicListingSummaries", () => {
  it("returns approved, newest-first, first-image-only summaries from JSON storage", async () => {
    vi.mocked(readStoredProperties).mockResolvedValueOnce([
      property({ id: "old", slug: "old", status: "approved", createdAt: "2026-05-01" }),
      property({ id: "draft", slug: "draft", status: "draft", createdAt: "2026-06-15" }),
      property({ id: "new", slug: "new", status: "approved", createdAt: "2026-06-20" }),
    ]);

    const summaries = await getPublicListingSummaries();

    expect(summaries.map((summary) => summary.id)).toEqual(["new", "old"]);
    expect(summaries[0].images).toHaveLength(1);
    expect(summaries[0].amenities).toEqual(["Kitchen"]);
    expect(summaries[0]).not.toHaveProperty("rules");
    expect(summaries[0]).not.toHaveProperty("bookingPackages");
  });
});
