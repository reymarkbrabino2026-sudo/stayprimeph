import { describe, expect, it, vi } from "vitest";
import {
  calculateNightlySubtotal,
  calculateGuestPriceWithMarkup,
  calculateHostPayoutFromTotal,
  calculateStayprimeMarkup,
  calculateStayprimeMarkupFromTotal,
  calculatePackageSubtotal,
  getBestDiscount,
  allowsPackageBooking,
  getEnabledBookingPackages,
  STAYPRIME_MARKUP_RATE,
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

  it("disables new listing promo after three bookings", () => {
    const bookings = ["b1", "b2", "b3"].map((id) => ({
      id, propertyId: "p1", guestId: "g1", hostId: "h1", checkIn: "2026-05-01", checkOut: "2026-05-02",
      guests: 1, totalPrice: 1000, status: "confirmed", paymentStatus: "pending", createdAt: "2026-05-01",
    })) satisfies Booking[];
    const discount = getBestDiscount({ property, bookings, checkIn: "2026-06-01", nights: 7, subtotal: 7000 });
    expect(discount?.key).toBe("weekly");
  });
});

describe("calculateStayprimeMarkup", () => {
  it("uses a single fixed 20% markup rate", () => {
    expect(STAYPRIME_MARKUP_RATE).toBe(0.2);
  });

  it("adds a 20% StayPrimePH markup", () => {
    expect(calculateStayprimeMarkup(10000)).toBe(2000);
  });

  it("adds the markup to guest-facing prices", () => {
    expect(calculateGuestPriceWithMarkup(10000)).toBe(12000);
  });

  it("uses the markup after discounts are applied to the host subtotal", () => {
    const discountedHostSubtotal = 25000;

    expect(calculateStayprimeMarkup(discountedHostSubtotal)).toBe(5000);
    expect(calculateGuestPriceWithMarkup(discountedHostSubtotal)).toBe(30000);
  });

  it("splits a guest-paid total back into markup and host payout", () => {
    expect(calculateStayprimeMarkupFromTotal(12000)).toBe(2000);
    expect(calculateHostPayoutFromTotal(12000)).toBe(10000);
  });

  it("rounds guest-total splits while keeping markup plus payout equal to the paid total", () => {
    const guestTotal = 5000;
    const markup = calculateStayprimeMarkupFromTotal(guestTotal);
    const hostPayout = calculateHostPayoutFromTotal(guestTotal);

    expect(markup).toBe(833);
    expect(hostPayout).toBe(4167);
    expect(markup + hostPayout).toBe(guestTotal);
  });
});

describe("calculateNightlySubtotal", () => {
  it("uses the weekday rate for Monday through Thursday nights", () => {
    const total = calculateNightlySubtotal({ pricePerNight: 1000, weekendPrice: 1500 }, "2026-06-15", "2026-06-19");
    expect(total).toEqual({ nights: 4, weekdayNights: 4, weekendNights: 0, subtotal: 4000 });
  });

  it("uses the weekend rate for Friday through Sunday nights", () => {
    const total = calculateNightlySubtotal({ pricePerNight: 1000, weekendPrice: 1500 }, "2026-06-19", "2026-06-22");
    expect(total).toEqual({ nights: 3, weekdayNights: 0, weekendNights: 3, subtotal: 4500 });
  });

  it("mixes weekday and weekend rates across the selected stay", () => {
    const total = calculateNightlySubtotal({ pricePerNight: 1000, weekendPrice: 1500 }, "2026-06-18", "2026-06-22");
    expect(total).toEqual({ nights: 4, weekdayNights: 1, weekendNights: 3, subtotal: 5500 });
  });

  it("applies the default weekend premium when no weekend rate is set", () => {
    const total = calculateNightlySubtotal({ pricePerNight: 1000 }, "2026-06-19", "2026-06-22");
    expect(total).toEqual({ nights: 3, weekdayNights: 0, weekendNights: 3, subtotal: 3600 });
  });

  it("uses holiday rates on configured holiday dates", () => {
    const total = calculateNightlySubtotal({
      pricePerNight: 1000,
      weekendPrice: 1500,
      holidayPrice: 2500,
      holidayDates: ["2026-06-18"],
    }, "2026-06-18", "2026-06-20");

    expect(total).toEqual({ nights: 2, weekdayNights: 1, weekendNights: 1, subtotal: 4000 });
  });

  it("uses seasonal rates inside configured date windows", () => {
    const total = calculateNightlySubtotal({
      pricePerNight: 1000,
      weekendPrice: 1500,
      seasonalRates: [{ name: "Peak", startDate: "2026-06-18", endDate: "2026-06-20", weekdayRate: 2000, weekendRate: 3000 }],
    }, "2026-06-18", "2026-06-21");

    expect(total).toEqual({ nights: 3, weekdayNights: 1, weekendNights: 2, subtotal: 8000 });
  });
});

describe("calculatePackageSubtotal", () => {
  it("uses package weekday and Friday-to-Sunday weekend rates with extra guest fees", () => {
    const total = calculatePackageSubtotal({
      id: "overnight-full-access",
      name: "Overnight Full Access",
      accessType: "Full access",
      unit: "night",
      weekdayRate: 15000,
      weekendRate: 18000,
      holidayRate: 18000,
      includedGuests: 18,
      maxGuests: 20,
      additionalGuestFee: 500,
      extensionHourlyFee: 1500,
      checkInTime: "2:00 PM",
      checkOutTime: "11:00 AM",
      enabled: true,
    }, "2026-06-15", "2026-06-20", 20);

    expect(total).toMatchObject({
      nights: 5,
      weekdayNights: 4,
      weekendNights: 1,
      extraGuests: 2,
      extraGuestFee: 5000,
      subtotal: 83000,
    });
  });
});

describe("listing privacy package access", () => {
  const packageListing = {
    ...property,
    bookingType: "package" as const,
    bookingPackages: [{
      id: "daytime-ground-outdoor",
      name: "Daytime Ground Floor & Outdoor",
      accessType: "Ground floor and outdoor area only",
      unit: "day" as const,
      weekdayRate: 8000,
      weekendRate: 0,
      includedGuests: 10,
      maxGuests: 12,
      additionalGuestFee: 500,
      extensionHourlyFee: 1000,
      checkInTime: "2:00 PM",
      checkOutTime: "10:00 PM",
      enabled: true,
    }],
  } satisfies Property;

  it("only exposes enabled booking packages for entire-place listings", () => {
    expect(allowsPackageBooking({ ...packageListing, privacyType: "private" })).toBe(false);
    expect(getEnabledBookingPackages({ ...packageListing, privacyType: "shared" })).toEqual([]);

    expect(allowsPackageBooking(packageListing)).toBe(true);
    expect(allowsPackageBooking({ ...packageListing, privacyType: "entire" })).toBe(true);
    expect(getEnabledBookingPackages({ ...packageListing, privacyType: "entire" })).toHaveLength(1);
  });
});
