import { describe, expect, it, vi } from "vitest";
import {
  calculateGuestPriceWithMarkup,
  calculateHostPayoutFromTotal,
  calculateStayprimeMarkup,
  calculateStayprimeMarkupFromTotal,
  getBestDiscount,
} from "@/lib/pricing";
import type { Booking, Property } from "@/lib/types";

const property: Property = {
  id: "p1", hostId: "h1", slug: "stay", title: "Stay", description: "Nice",
  address: "Somewhere", city: "Davao", country: "Philippines", pricePerNight: 1000,
  bedrooms: 1, bathrooms: 1, maxGuests: 2, propertyType: "house", status: "approved",
  rating: 5, amenities: [], rules: [], createdAt: "2026-05-17", images: [],
  discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true },
};

describe("getBestDiscount", () => {
  it("chooses the largest applicable discount", () => {
    vi.setSystemTime(new Date("2026-05-17T00:00:00Z"));
    const discount = getBestDiscount({ property, bookings: [], checkIn: "2026-05-20", nights: 30, subtotal: 30000 });
    expect(discount?.key).toBe("newListing");
    expect(discount?.amount).toBe(6000);
});

describe("calculateStayprimeMarkup", () => {
  it("adds a 20% StayPrimePH markup", () => {
    expect(calculateStayprimeMarkup(10000)).toBe(2000);
  });

  it("adds the markup to guest-facing prices", () => {
    expect(calculateGuestPriceWithMarkup(10000)).toBe(12000);
  });

  it("splits a guest-paid total back into markup and host payout", () => {
    expect(calculateStayprimeMarkupFromTotal(12000)).toBe(2000);
    expect(calculateHostPayoutFromTotal(12000)).toBe(10000);
  });
});

  it("disables new listing promo after three bookings", () => {
    const bookings = ["b1", "b2", "b3"].map((id) => ({
      id, propertyId: "p1", guestId: "g1", hostId: "h1", checkIn: "2026-05-01", checkOut: "2026-05-02",
      guests: 1, totalPrice: 1000, status: "confirmed", paymentStatus: "pending", createdAt: "2026-05-01",
    })) satisfies Booking[];
    const discount = getBestDiscount({ property, bookings, checkIn: "2026-06-01", nights: 7, subtotal: 7000 });
    expect(discount?.key).toBe("weekly");
  });
});
