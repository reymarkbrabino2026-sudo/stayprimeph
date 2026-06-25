import type { HostBookingPackageDraft } from "@/lib/host-wizard-types";

const seededPackageRates: Record<string, Pick<HostBookingPackageDraft, "weekdayRate" | "weekendRate" | "holidayRate">> = {
  "overnight-full-access": {
    weekdayRate: 15000,
    weekendRate: 18000,
    holidayRate: 18000,
  },
  "daytime-ground-outdoor": {
    weekdayRate: 8000,
    weekendRate: 0,
    holidayRate: 0,
  },
};

function shouldSyncRate(current: number, previous: number, seeded?: number) {
  return current > 0 && (current === previous || (seeded !== undefined && seeded > 0 && current === seeded));
}

export function syncedBookingPackagesForPricing({
  packages,
  previousBasePrice,
  previousWeekendPrice,
  nextBasePrice,
  nextWeekendPrice,
}: {
  packages: HostBookingPackageDraft[];
  previousBasePrice: number;
  previousWeekendPrice: number;
  nextBasePrice: number;
  nextWeekendPrice: number;
}) {
  return packages.map((pkg) => {
    const seeded = seededPackageRates[pkg.id];

    return {
      ...pkg,
      weekdayRate: shouldSyncRate(pkg.weekdayRate, previousBasePrice, seeded?.weekdayRate) ? nextBasePrice : pkg.weekdayRate,
      weekendRate: shouldSyncRate(pkg.weekendRate, previousWeekendPrice, seeded?.weekendRate) ? nextWeekendPrice : pkg.weekendRate,
      holidayRate: shouldSyncRate(pkg.holidayRate, previousWeekendPrice, seeded?.holidayRate) ? nextWeekendPrice : pkg.holidayRate,
    };
  });
}
