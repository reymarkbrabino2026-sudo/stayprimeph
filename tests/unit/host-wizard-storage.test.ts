import { beforeEach, describe, expect, test } from "vitest";
import type { HostListingDraft } from "@/lib/host-wizard-types";
import {
  clearStoredHostWizardDraft,
  hostWizardStorageKey,
  sanitizeHostWizardDraftForStorage,
} from "@/stores/host-wizard-store";

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
    rooms: [],
    amenityIds: ["wifi"],
    photos: [{ id: "photo-1", url: "https://assets.example/photo.jpg", name: "photo.jpg", size: 100, isCover: true, category: "kitchen" }],
    title: "Prime stay",
    highlights: ["peaceful"],
    description: "A comfortable place for a family stay.",
    virtualTourUrl: "",
    listingVideoUrl: "",
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

describe("host wizard local storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("keeps publish-required draft fields for refresh recovery", () => {
    const stored = sanitizeHostWizardDraftForStorage(draft());
    const serialized = JSON.stringify(stored);

    expect(stored).toMatchObject({
      uploadScopeId: "draft-1",
      street: "123 Prime Street",
      barangay: "Mamacao",
      city: "Santa Maria",
      province: "Davao Occidental",
      zipCode: "8011",
      latitude: 6.5801,
      longitude: 125.4574,
      locationConfirmed: true,
      locationConfirmedAddress: "123 Prime Street, Mamacao, Santa Maria, Davao Occidental, Philippines, 8011",
      preciseLocation: true,
      title: "Prime stay",
      photos: [
        expect.objectContaining({ category: "kitchen" }),
      ],
      residentialAddress: {
        street: "456 Residential Street",
        barangay: "Sensitive Barangay",
      },
      hostAsBusiness: true,
    });
    expect(serialized).toContain("123 Prime Street");
    expect(serialized).toContain("456 Residential Street");
    expect(serialized).toContain("Sensitive Barangay");
  });

  test("starts untouched pricing and package values at zero", () => {
    const stored = sanitizeHostWizardDraftForStorage({});
    const packages = stored.bookingPackages ?? [];

    expect(stored).toMatchObject({
      basePrice: 0,
      weekendPrice: 0,
      weekendPremium: 0,
      cleaningFee: 0,
    });
    expect(packages).toHaveLength(2);
    expect(packages[0]).toMatchObject({
      weekdayRate: 0,
      weekendRate: 0,
      holidayRate: 0,
      includedGuests: 0,
      maxGuests: 0,
      sleepingCapacity: 0,
      durationHours: 0,
      additionalGuestFee: 0,
      extensionHourlyFee: 0,
      minimumAdvanceBookingDays: 0,
    });
    expect(packages[1]).toMatchObject({
      weekdayRate: 0,
      weekendRate: 0,
      holidayRate: 0,
      includedGuests: 0,
      maxGuests: 0,
      sleepingCapacity: 0,
      durationHours: 0,
      additionalGuestFee: 0,
      extensionHourlyFee: 0,
      minimumAdvanceBookingDays: 0,
    });
  });

  test("defaults overnight full access to every visible package access option", () => {
    const stored = sanitizeHostWizardDraftForStorage({});
    const packages = stored.bookingPackages ?? [];
    const overnightPackage = packages.find((item) => item.id === "overnight-full-access");

    const visibleAreas = Array.from(new Set(packages.flatMap((item) => item.accessibleFloors)));
    const visibleAmenities = Array.from(new Set(packages.flatMap((item) => item.includedAmenities)));

    expect(overnightPackage?.accessibleFloors).toEqual(visibleAreas);
    expect(overnightPackage?.includedAmenities).toEqual(visibleAmenities);
    expect(overnightPackage?.excludedAmenities).toEqual([]);
  });

  test("scopes stored draft keys by encoded user id", () => {
    expect(hostWizardStorageKey("host@example.com")).toBe("stayprimeph-host-wizard:host%40example.com");
  });

  test("clears the selected user's draft and legacy draft", () => {
    window.localStorage.setItem("stayprimeph-host-wizard", "{}");
    window.localStorage.setItem(hostWizardStorageKey("host-1"), "{}");
    window.localStorage.setItem(hostWizardStorageKey("host-2"), "{}");
    window.localStorage.setItem("stayprimeph-wishlist", "[]");

    clearStoredHostWizardDraft("host-1");

    expect(window.localStorage.getItem("stayprimeph-host-wizard")).toBeNull();
    expect(window.localStorage.getItem(hostWizardStorageKey("host-1"))).toBeNull();
    expect(window.localStorage.getItem(hostWizardStorageKey("host-2"))).toBe("{}");
    expect(window.localStorage.getItem("stayprimeph-wishlist")).toBe("[]");
  });

  test("clears every host draft on logout without deleting unrelated client state", () => {
    window.localStorage.setItem("stayprimeph-host-wizard", "{}");
    window.localStorage.setItem(hostWizardStorageKey("host-1"), "{}");
    window.localStorage.setItem(hostWizardStorageKey("host-2"), "{}");
    window.localStorage.setItem("stayprimeph-wishlist", "[]");

    clearStoredHostWizardDraft();

    expect(window.localStorage.getItem("stayprimeph-host-wizard")).toBeNull();
    expect(window.localStorage.getItem(hostWizardStorageKey("host-1"))).toBeNull();
    expect(window.localStorage.getItem(hostWizardStorageKey("host-2"))).toBeNull();
    expect(window.localStorage.getItem("stayprimeph-wishlist")).toBe("[]");
  });
});
