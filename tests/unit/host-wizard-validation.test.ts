import { describe, expect, it } from "vitest";
import { hostListingAddressSchema, hostListingSchema } from "@/lib/host-wizard-schema";
import { activeHostWizardSteps } from "@/lib/host-wizard-steps";
import { canAdvanceFromStep, getFirstIncompleteHostWizardStep, getMissingRequirementsForStep } from "@/lib/host-wizard-validation";
import type { HostBookingPackageDraft, HostListingDraft } from "@/lib/host-wizard-types";

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

function photos() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `photo-${index}`,
    url: `/uploads/listings/host-1/draft-test/photo-${index}.jpg`,
    name: `Photo ${index}`,
    size: 100,
    isCover: index === 0,
  }));
}

function bookingPackage(overrides: Partial<HostBookingPackageDraft> = {}): HostBookingPackageDraft {
  return {
    id: "package-1",
    name: "Overnight Full Access",
    description: "Whole-villa overnight package.",
    status: "active",
    displayOrder: 1,
    accessType: "Full access",
    unit: "night",
    weekdayRate: 9500,
    weekendRate: 10500,
    holidayRate: 11500,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 4,
    maxGuests: 15,
    sleepingCapacity: 15,
    durationHours: 21,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    accessibleFloors: ["Ground Floor"],
    accessibleRoomIds: [],
    includedAmenities: ["Wifi"],
    excludedAmenities: [],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 0,
    blockedPackageIds: [],
    enabled: true,
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

  it("explains why a step cannot continue", () => {
    expect(getMissingRequirementsForStep("address", draft({ street: "1" }))).toEqual([
      "Check the listing address. Street address and ZIP code need to be complete.",
    ]);
    expect(canAdvanceFromStep("address", draft({ street: "1" }))).toBe(false);
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

  it("finds the first incomplete publish requirement", () => {
    const missing = getFirstIncompleteHostWizardStep(draft({ photos: [] }));

    expect(missing?.step.id).toBe("photos");
    expect(missing?.messages).toEqual(["Upload 5 more photos."]);
  });

  it("points to enabled booking packages that still need required fields", () => {
    const missing = getFirstIncompleteHostWizardStep(draft({
      photos: photos(),
      bookingType: "package",
      pricingMode: "packages",
      bookingPackages: [{
        id: "package-1",
        name: "Day pass",
        description: "",
        status: "active",
        displayOrder: 1,
        accessType: "Pool area",
        unit: "day",
        weekdayRate: 0,
        weekendRate: 0,
        holidayRate: 0,
        holidayDates: [],
        seasonalRates: [],
        includedGuests: 0,
        maxGuests: 0,
        sleepingCapacity: 0,
        durationHours: 0,
        additionalGuestFee: 0,
        extensionHourlyFee: 0,
        checkInTime: "9:00 AM",
        checkOutTime: "5:00 PM",
        accessibleFloors: [],
        accessibleRoomIds: [],
        includedAmenities: [],
        excludedAmenities: [],
        availableDays: [],
        minimumAdvanceBookingDays: 0,
        blockedPackageIds: [],
        enabled: true,
      }],
    }));

    expect(missing?.step.id).toBe("booking-packages");
    expect(missing?.messages[0]).toContain("weekday rate");
    expect(missing?.messages[0]).toContain("available days");
  });

  it("allows package pricing to publish using enabled package rates when simple prices are zero", () => {
    const parsed = hostListingSchema.safeParse(draft({
      photos: photos(),
      bookingType: "both",
      pricingMode: "packages",
      basePrice: 0,
      weekendPrice: 0,
      status: "pending",
      bookingPackages: [bookingPackage()],
    }));

    expect(parsed.success).toBe(true);
  });

  it("allows simple pricing to publish with disabled package templates at zero", () => {
    const parsed = hostListingSchema.safeParse(draft({
      photos: photos(),
      pricingMode: "simple",
      bookingType: "stay",
      status: "pending",
      bookingPackages: [
        bookingPackage({
          weekdayRate: 0,
          weekendRate: 0,
          holidayRate: 0,
          includedGuests: 0,
          maxGuests: 0,
          sleepingCapacity: 0,
          durationHours: 0,
          accessType: "Full access",
          enabled: false,
        }),
      ],
    }));

    expect(parsed.success).toBe(true);
  });

  it("still requires a weekday rate for enabled packages", () => {
    const parsed = hostListingSchema.safeParse(draft({
      photos: photos(),
      bookingType: "package",
      pricingMode: "packages",
      basePrice: 0,
      weekendPrice: 0,
      status: "pending",
      bookingPackages: [bookingPackage({ weekdayRate: 0 })],
    }));

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain("Enter a weekday rate for this package.");
    }
  });

  it("still requires simple pricing when simple nightly pricing is selected", () => {
    const parsed = hostListingSchema.safeParse(draft({
      photos: photos(),
      pricingMode: "simple",
      basePrice: 0,
      weekendPrice: 0,
      status: "pending",
    }));

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining(["basePrice", "weekendPrice"]));
    }
  });
});
