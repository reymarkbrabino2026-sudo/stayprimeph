import { describe, expect, it } from "vitest";
import { hostListingAddressSchema } from "@/lib/host-wizard-schema";
import { activeHostWizardSteps } from "@/lib/host-wizard-steps";
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
    rooms: [],
    amenityIds: ["wifi"],
    photos: [],
    title: "Prime stay",
    highlights: ["peaceful"],
    description: "A comfortable place for a family stay.",
    virtualTourUrl: "",
    bookingType: "stay",
    bookingMode: "request",
    pricingMode: "simple",
    basePrice: 2500,
    weekendPrice: 2600,
    holidayPrice: 0,
    holidayDates: [],
    seasonalRates: [],
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
  it("validates address fields without deriving from the refined publish schema", () => {
    const parsed = hostListingAddressSchema.safeParse({
      country: "Philippines",
      street: "123 Prime Street",
      barangay: "Mamacao",
      city: "Santa Maria",
      province: "Davao Occidental",
      zipCode: "8011",
    });

    expect(parsed.success).toBe(true);
  });

  it("requires a confirmed pin before leaving the location step", () => {
    expect(canAdvanceFromStep("location", draft({ locationConfirmed: false }))).toBe(false);
    expect(canAdvanceFromStep("location", draft())).toBe(true);
  });

  it("invalidates the confirmed pin when the address changes", () => {
    expect(canAdvanceFromStep("visibility", draft({ street: "456 Changed Street" }))).toBe(false);
  });

  it("allows the virtual tour step to be skipped", () => {
    expect(canAdvanceFromStep("virtual-tour", draft({ virtualTourUrl: "" }))).toBe(true);
  });

  it("requires a valid virtual tour URL when one is entered", () => {
    expect(canAdvanceFromStep("virtual-tour", draft({ virtualTourUrl: "not a link" }))).toBe(false);
    expect(canAdvanceFromStep("virtual-tour", draft({ virtualTourUrl: "https://my.matterport.com/show/?m=abc123" }))).toBe(true);
  });

  it("applies package access steps only to entire-place package pricing", () => {
    const privateRoomDraft = draft({
      privacyType: "private",
      bookingType: "package",
      pricingMode: "packages",
      rooms: [{ id: "room-1", name: "", capacity: 0, floor: "", description: "", photos: [], amenities: [], active: true }],
      bookingPackages: [],
    });

    expect(activeHostWizardSteps(privateRoomDraft).map((step) => step.id)).not.toContain("rooms");
    expect(activeHostWizardSteps(privateRoomDraft).map((step) => step.id)).not.toContain("booking-packages");
    expect(canAdvanceFromStep("rooms", privateRoomDraft)).toBe(true);
    expect(canAdvanceFromStep("booking-packages", privateRoomDraft)).toBe(true);

    const simpleSteps = activeHostWizardSteps(draft()).map((step) => step.id);
    expect(simpleSteps).toContain("rooms");
    expect(simpleSteps).toContain("pricing");
    expect(simpleSteps).toContain("weekend-pricing");
    expect(simpleSteps).not.toContain("booking-packages");

    const packageSteps = activeHostWizardSteps(draft({ bookingType: "package", pricingMode: "packages" })).map((step) => step.id);
    expect(packageSteps).toContain("rooms");
    expect(packageSteps).not.toContain("pricing");
    expect(packageSteps).not.toContain("weekend-pricing");
    expect(packageSteps).toContain("booking-packages");
  });
});
