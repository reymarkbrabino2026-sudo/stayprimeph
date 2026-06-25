import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SearchResultCard } from "@/components/search/search-result-card";
import type { PublicListingSummary } from "@/lib/types";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    return React.createElement("img", imageProps);
  },
}));

const property: PublicListingSummary = {
  id: "listing-1",
  slug: "listing-1",
  title: "POD MountainViews+Cozy+NoParking+OG Channel",
  city: "Baguio",
  country: "Philippines",
  pricePerNight: 1000,
  weekendPrice: 1000,
  bedrooms: 1,
  bathrooms: 1,
  maxGuests: 2,
  propertyType: "tiny-home",
  amenities: ["WiFi", "Washer"],
  rating: 4.95,
  createdAt: "2026-06-01",
  discounts: { newListing: false, lastMinute: false, weekly: true, monthly: false },
  images: [
    { id: "image-1", propertyId: "listing-1", imageUrl: "/uploads/listings/photo-1.webp", tone: "from-rose-100 via-orange-50 to-stone-100" },
    { id: "image-2", propertyId: "listing-1", imageUrl: "/uploads/listings/photo-2.webp", tone: "from-blue-100 via-sky-50 to-stone-100" },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SearchResultCard", () => {
  test("shows favorite badge, carousel controls, all-fee stay total, and weekly discount", () => {
    render(
      <SearchResultCard
        property={property}
        isAuthenticated={false}
        checkIn="2026-07-01"
        checkOut="2026-07-10"
      />,
    );

    expect(screen.getByText("Guest favorite")).toBeInTheDocument();
    expect(screen.getByText("Tiny Home in Baguio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show next photo" })).toBeInTheDocument();
    expect(screen.getByText("Weekly discount")).toBeInTheDocument();
    expect(screen.getByText("for 9 nights")).toBeInTheDocument();
    expect(screen.getByText(/9,720/)).toBeInTheDocument();
  });
});
