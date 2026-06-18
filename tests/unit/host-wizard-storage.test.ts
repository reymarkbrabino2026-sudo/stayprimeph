import { describe, expect, test } from "vitest";
import type { HostListingDraft } from "@/lib/host-wizard-types";
import { sanitizeHostWizardDraftForStorage } from "@/stores/host-wizard-store";

function draft(): HostListingDraft {
  return {
    uploadScopeId: "draft-1",
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
    locationConfirmedAddress: "123 Prime Street, Mamacao, Santa Maria, Davao Occidental, Philippines, 8011",
    lastAutoGeocodeAddress: "123 Prime Street, Mamacao, Santa Maria, Davao Occidental, Philippines, 8011",
    propertyType: "house",
    privacyType: "entire",
    preciseLocation: true,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    amenityIds: ["wifi"],
    photos: [{ id: "photo-1", url: "https://assets.example/photo.jpg", name: "photo.jpg", size: 100, isCover: true }],
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
    residentialAddress: {
      unit: "2A",
      building: "Prime Building",
      street: "456 Residential Street",
      barangay: "Sensitive Barangay",
      city: "Manila",
      zipCode: "1000",
      province: "Metro Manila",
    },
    hostAsBusiness: true,
    status: "draft",
    bookingPackages: [],
  };
}

describe("host wizard local storage minimization", () => {
  test("removes sensitive host draft fields before localStorage persistence", () => {
    const stored = sanitizeHostWizardDraftForStorage(draft());
    const serialized = JSON.stringify(stored);

    expect(stored).toMatchObject({
      uploadScopeId: "draft-1",
      city: "Santa Maria",
      province: "Davao Occidental",
      title: "Prime stay",
    });
    expect(stored).not.toHaveProperty("street");
    expect(stored).not.toHaveProperty("barangay");
    expect(stored).not.toHaveProperty("zipCode");
    expect(stored).not.toHaveProperty("latitude");
    expect(stored).not.toHaveProperty("longitude");
    expect(stored).not.toHaveProperty("locationConfirmedAddress");
    expect(stored).not.toHaveProperty("lastAutoGeocodeAddress");
    expect(stored).not.toHaveProperty("preciseLocation");
    expect(stored).not.toHaveProperty("residentialAddress");
    expect(stored).not.toHaveProperty("hostAsBusiness");
    expect(serialized).not.toContain("123 Prime Street");
    expect(serialized).not.toContain("456 Residential Street");
    expect(serialized).not.toContain("Sensitive Barangay");
  });
});
