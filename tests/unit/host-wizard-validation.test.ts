import { describe, expect, it } from "vitest";
import { canAdvanceFromStep } from "@/lib/host-wizard-validation";
import type { HostListingDraft } from "@/lib/host-wizard-types";

function draft(overrides: Partial<HostListingDraft> = {}): HostListingDraft {
  const address = "123 Prime Street, Mamacao, Santa Maria, Davao Occidental, Philippines, 8011";

  return {
    uploadScopeId: "draft-test",
    country: "Philippines",
    street: "123 Prime Street",
    barangay: "Mamacao",
    city: "Santa Maria",
    province: "Davao Occidental",
    zipCode: "8011",
    latitude: 6.5801,
    longitude: 125.4574,
    locationPinned: true,
    locationConfirmed: true,
    locationConfirmedAddress: address,
    lastAutoGeocodeAddress: address,
    propertyType: "house",
    privacyType: "entire",
    preciseLocation: true,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    amenityIds: ["wifi"],
    photos: [],
    title: "Prime stay",
    highlights: ["peaceful"],
    description: "A comfortable place for a family stay.",
    bookingMode: "request",
    pricingMode: "simple",
    basePrice: 2500,
    weekendPrice: 2600,
    weekendPremium: 4,
    cleaningFee: 500,
    securityDeposit: 0,
    currency: "PHP",
    cancellationPolicy: "flexible",
    discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true },
    safetyDisclosures: { exteriorCamera: false, noiseMonitor: false, weapons: false },
    residentialAddress: { unit: "", building: "", street: "123 Prime Street", barangay: "Mamacao", city: "Santa Maria", zipCode: "8011", province: "Davao Occidental" },
    hostAsBusiness: false,
    status: "draft",
    bookingPackages: [],
    ...overrides,
  };
}

describe("host wizard location validation", () => {
  it("requires a confirmed pin before leaving the location step", () => {
    expect(canAdvanceFromStep("location", draft({ locationConfirmed: false }))).toBe(false);
    expect(canAdvanceFromStep("location", draft())).toBe(true);
  });

  it("invalidates the confirmed pin when the address changes", () => {
    expect(canAdvanceFromStep("visibility", draft({ street: "456 Changed Street" }))).toBe(false);
  });
});
