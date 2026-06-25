import type { HostBookingPackageDraft, HostListingDraft } from "@/lib/host-wizard-types";

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

function minimumPositiveRate(values: number[]) {
  const positiveValues = values.filter((value) => Number.isFinite(value) && value > 0);
  return positiveValues.length ? Math.min(...positiveValues) : 0;
}

function maximumPositiveRate(values: number[]) {
  const positiveValues = values.filter((value) => Number.isFinite(value) && value > 0);
  return positiveValues.length ? Math.max(...positiveValues) : 0;
}

function packageDisplayRates(pkg: HostBookingPackageDraft) {
  return [
    pkg.weekdayRate,
    pkg.weekendRate > 0 ? pkg.weekendRate : pkg.weekdayRate,
  ];
}

export function getHostWizardPricingDisplay(input: Pick<HostListingDraft, "pricingMode" | "basePrice" | "weekendPrice" | "bookingPackages">) {
  const bookablePackages = input.bookingPackages.filter((pkg) => pkg.enabled && pkg.status !== "inactive");
  const usesPackagePrices = input.pricingMode === "packages" && bookablePackages.length > 0;
  const packagePriceValues = bookablePackages.flatMap(packageDisplayRates);
  const packageMinimumPrice = minimumPositiveRate(packagePriceValues);
  const packageMaximumPrice = maximumPositiveRate(packagePriceValues);

  return {
    bookablePackages,
    bookablePackageCount: bookablePackages.length,
    weekdayPrice: usesPackagePrices ? minimumPositiveRate(bookablePackages.map((pkg) => pkg.weekdayRate)) : input.basePrice,
    weekendPrice: usesPackagePrices
      ? minimumPositiveRate(bookablePackages.map((pkg) => pkg.weekendRate > 0 ? pkg.weekendRate : pkg.weekdayRate))
      : input.weekendPrice,
    minimumPrice: usesPackagePrices ? packageMinimumPrice : input.basePrice,
    maximumPrice: usesPackagePrices ? packageMaximumPrice : input.weekendPrice,
    usesPackagePrices,
  };
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
