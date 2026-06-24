import { describe, expect, test } from "vitest";
import { syncedBookingPackagesForPricing } from "@/lib/host-wizard-pricing";
import type { HostBookingPackageDraft } from "@/lib/host-wizard-types";

const packages = [
  {
    id: "overnight-full-access",
    name: "Overnight Full Access",
    description: "Whole villa overnight",
    status: "active",
    displayOrder: 1,
    accessType: "Full access",
    unit: "night",
    weekdayRate: 15000,
    weekendRate: 18000,
    holidayRate: 18000,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 18,
    maxGuests: 20,
    sleepingCapacity: 18,
    durationHours: 21,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    accessibleFloors: ["Ground Floor", "Second Floor"],
    accessibleRoomIds: ["sanctuary-suite"],
    includedAmenities: ["WiFi"],
    excludedAmenities: [],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 1,
    blockedPackageIds: ["daytime-ground-outdoor"],
    enabled: false,
  },
  {
    id: "daytime-ground-outdoor",
    name: "Daytime Ground Floor & Outdoor",
    description: "Daytime access",
    status: "active",
    displayOrder: 2,
    accessType: "Ground floor and outdoor area only",
    unit: "day",
    weekdayRate: 8000,
    weekendRate: 0,
    holidayRate: 0,
    holidayDates: [],
    seasonalRates: [],
    includedGuests: 18,
    maxGuests: 20,
    sleepingCapacity: 0,
    durationHours: 8,
    additionalGuestFee: 500,
    extensionHourlyFee: 1500,
    checkInTime: "2:00 PM",
    checkOutTime: "10:00 PM",
    accessibleFloors: ["Ground Floor"],
    accessibleRoomIds: [],
    includedAmenities: ["WiFi"],
    excludedAmenities: ["Bedrooms"],
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    minimumAdvanceBookingDays: 1,
    blockedPackageIds: ["overnight-full-access"],
    enabled: false,
  },
] satisfies HostBookingPackageDraft[];

describe("host wizard pricing", () => {
  test("syncs seeded booking package rates to the selected base and weekend prices", () => {
    const synced = syncedBookingPackagesForPricing({
      packages,
      previousBasePrice: 2528,
      previousWeekendPrice: 2579,
      nextBasePrice: 4800,
      nextWeekendPrice: 5664,
    });

    expect(synced).toEqual([
      expect.objectContaining({ weekdayRate: 4800, weekendRate: 5664, holidayRate: 5664 }),
      expect.objectContaining({ weekdayRate: 4800, weekendRate: 5664, holidayRate: 5664 }),
    ]);
  });

  test("keeps package rates that were manually customized", () => {
    const synced = syncedBookingPackagesForPricing({
      packages: [
        {
          ...packages[0],
          weekdayRate: 7000,
          weekendRate: 9000,
          holidayRate: 10000,
        },
      ],
      previousBasePrice: 4800,
      previousWeekendPrice: 5664,
      nextBasePrice: 5200,
      nextWeekendPrice: 6136,
    });

    expect(synced[0]).toMatchObject({
      weekdayRate: 7000,
      weekendRate: 9000,
      holidayRate: 10000,
    });
  });
});
