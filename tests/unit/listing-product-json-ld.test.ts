import { describe, expect, test } from "vitest";
import { buildListingProductJsonLd } from "@/lib/listing-product-json-ld";
import type { Property, Review } from "@/lib/types";

const property: Property = {
  id: "property-1",
  hostId: "host-1",
  slug: "test-stay",
  title: "Test Stay",
  description: "A quiet private stay.",
  address: "123 Test Street",
  city: "Lucena",
  country: "Philippines",
  pricePerNight: 15000,
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 8,
  propertyType: "resort",
  status: "approved",
  rating: 0,
  amenities: ["Pool"],
  rules: ["No smoking"],
  createdAt: "2026-07-01",
  images: [],
};

const review: Review = {
  id: "review-1",
  propertyId: property.id,
  guestId: "guest-1",
  rating: 5,
  comment: "The place was clean and exactly as described.",
  createdAt: "2026-07-09",
};

describe("buildListingProductJsonLd", () => {
  test("omits Product markup for listings without real ratings", () => {
    expect(
      buildListingProductJsonLd({
        property,
        reviews: [],
        reviewGuestById: new Map(),
        listingUrl: "https://stayprime.ph/rooms/property-1",
        listingImages: [],
      }),
    ).toBeNull();
  });

  test("includes aggregate rating and review markup from real guest reviews", () => {
    const jsonLd = buildListingProductJsonLd({
      property,
      reviews: [review],
      reviewGuestById: new Map([["guest-1", { name: "Maria Santos" }]]),
      listingUrl: "https://stayprime.ph/rooms/property-1",
      listingImages: ["https://stayprime.ph/uploads/property.jpg"],
    });

    expect(jsonLd).toMatchObject({
      "@type": "Product",
      name: "Test Stay",
      image: ["https://stayprime.ph/uploads/property.jpg"],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: 5,
        reviewCount: 1,
        bestRating: 5,
        worstRating: 1,
      },
      review: [
        {
          "@type": "Review",
          author: { "@type": "Person", name: "Maria Santos" },
          datePublished: "2026-07-09",
          reviewBody: "The place was clean and exactly as described.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: 5,
            bestRating: 5,
            worstRating: 1,
          },
        },
      ],
    });
  });
});
