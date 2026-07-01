import type { Booking, BookingPackage, ListingDiscounts, ListingRateAdjustment, Property, SeasonalRate } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const STAYPRIME_MARKUP_RATE = 0.2;
export const DEFAULT_WEEKEND_PREMIUM_RATE = 0.2;
export type DiscountBooking = Pick<Booking, "propertyId" | "status">;

export interface AppliedDiscount {
  key: keyof ListingDiscounts;
  label: string;
  percent: number;
  amount: number;
}

export interface NightlyRates {
  pricePerNight: number;
  weekendPrice?: number | null;
  holidayPrice?: number | null;
  holidayDates?: string[];
  seasonalRates?: SeasonalRate[];
  rateAdjustments?: ListingRateAdjustment[];
}

export interface RateAdjustmentDiscount {
  id: string;
  label: string;
  date: string;
  amount: number;
  percent?: number;
}

export interface NightlySubtotal {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  grossSubtotal: number;
  subtotal: number;
  rateAdjustmentDiscounts: RateAdjustmentDiscount[];
}

export interface PackageSubtotal extends NightlySubtotal {
  unitCount: number;
  extraGuests: number;
  extraGuestFee: number;
  extensionFee: number;
}

const defaultDiscounts: ListingDiscounts = { newListing: false, lastMinute: false, weekly: false, monthly: false };
const dayMs = 86400000;
const weekendDayIndexes = new Set([0, 5, 6]);

function dateKeyToUtcTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = new Date(`${value}T00:00:00.000Z`).getTime();
  return Number.isFinite(time) ? time : NaN;
}

function toDateKeyFromUtcTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function isDateKey(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dateKeyToUtcTime(value)));
}

function rateIsPositive(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0;
}

function seasonalRateForDate(dateKey: string, seasonalRates: SeasonalRate[] = []) {
  return seasonalRates.find((season) =>
    isDateKey(season.startDate) &&
    isDateKey(season.endDate) &&
    season.startDate <= dateKey &&
    dateKey <= season.endDate &&
    rateIsPositive(season.weekdayRate),
  ) ?? null;
}

function adjustmentIsActive(adjustment: ListingRateAdjustment) {
  return adjustment.active !== false;
}

function adjustmentMatchesDate(adjustment: ListingRateAdjustment, dateKey: string) {
  return adjustmentIsActive(adjustment) &&
    isDateKey(adjustment.startDate) &&
    isDateKey(adjustment.endDate) &&
    adjustment.startDate <= dateKey &&
    dateKey <= adjustment.endDate;
}

function adjustmentRangeDays(adjustment: ListingRateAdjustment) {
  const start = dateKeyToUtcTime(adjustment.startDate);
  const end = dateKeyToUtcTime(adjustment.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}

function rateAdjustmentRateForDate(adjustment: ListingRateAdjustment, dateKey: string) {
  const weekdayRate = rateIsPositive(adjustment.weekdayRate) ? Number(adjustment.weekdayRate) : null;
  const weekendRate = rateIsPositive(adjustment.weekendRate) ? Number(adjustment.weekendRate) : weekdayRate;
  if (!weekdayRate) return null;
  return isWeekendNight(dateKey) ? weekendRate ?? weekdayRate : weekdayRate;
}

function rateOverrideForDate(rates: NightlyRates, dateKey: string) {
  const priority: Record<ListingRateAdjustment["type"], number> = { custom: 2, monthly: 1, discount: 0 };

  return (rates.rateAdjustments ?? [])
    .filter((adjustment) =>
      (adjustment.type === "custom" || adjustment.type === "monthly") &&
      adjustmentMatchesDate(adjustment, dateKey) &&
      rateAdjustmentRateForDate(adjustment, dateKey) !== null,
    )
    .sort((a, b) =>
      priority[b.type] - priority[a.type] ||
      adjustmentRangeDays(a) - adjustmentRangeDays(b) ||
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
      b.id.localeCompare(a.id),
    )[0] ?? null;
}

function baseNightlyRateForDate(rates: NightlyRates, dateKey: string) {
  const override = rateOverrideForDate(rates, dateKey);
  const overrideRate = override ? rateAdjustmentRateForDate(override, dateKey) : null;
  if (overrideRate !== null) return overrideRate;

  const season = seasonalRateForDate(dateKey, rates.seasonalRates);
  const weekdayRate = season?.weekdayRate ?? rates.pricePerNight;
  const weekendRate = rateIsPositive(season?.weekendRate)
    ? Number(season?.weekendRate)
    : rateIsPositive(rates.weekendPrice)
      ? Number(rates.weekendPrice)
      : calculateDefaultWeekendPrice(weekdayRate);
  const holidayRate = rateIsPositive(season?.holidayRate)
    ? Number(season?.holidayRate)
    : rateIsPositive(rates.holidayPrice)
      ? Number(rates.holidayPrice)
      : null;

  if ((rates.holidayDates ?? []).includes(dateKey) && holidayRate) return holidayRate;
  return isWeekendNight(dateKey) ? weekendRate : weekdayRate;
}

function discountAmountForAdjustment(adjustment: ListingRateAdjustment, grossRate: number) {
  const percentAmount = rateIsPositive(adjustment.discountPercent)
    ? Math.round(grossRate * (Number(adjustment.discountPercent) / 100))
    : 0;
  const fixedAmount = rateIsPositive(adjustment.discountAmount) ? Number(adjustment.discountAmount) : 0;
  return Math.min(grossRate, Math.max(percentAmount, fixedAmount));
}

function discountAdjustmentForDate(rates: NightlyRates, dateKey: string, grossRate: number) {
  return (rates.rateAdjustments ?? [])
    .filter((adjustment) => adjustment.type === "discount" && adjustmentMatchesDate(adjustment, dateKey))
    .map((adjustment) => ({
      adjustment,
      amount: discountAmountForAdjustment(adjustment, grossRate),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) =>
      b.amount - a.amount ||
      adjustmentRangeDays(a.adjustment) - adjustmentRangeDays(b.adjustment) ||
      (b.adjustment.createdAt ?? "").localeCompare(a.adjustment.createdAt ?? "") ||
      b.adjustment.id.localeCompare(a.adjustment.id),
    )[0] ?? null;
}

export function getNightlyRateDetails(rates: NightlyRates, dateKey: string) {
  const grossRate = baseNightlyRateForDate(rates, dateKey);
  const discount = discountAdjustmentForDate(rates, dateKey, grossRate);
  const discountAmount = discount?.amount ?? 0;

  return {
    dateKey,
    grossRate,
    netRate: Math.max(0, grossRate - discountAmount),
    discountAmount,
    discountLabel: discount?.adjustment.name,
    discountPercent: discount?.adjustment.discountPercent,
    discountId: discount?.adjustment.id,
  };
}

export function getListingDiscounts(property: Property): ListingDiscounts {
  return { ...defaultDiscounts, ...property.discounts };
}

function daysUntil(checkIn: string) {
  return Math.ceil((new Date(checkIn).getTime() - Date.now()) / 86400000);
}

export function getApplicableDiscounts({
  property, bookings, checkIn, nights, subtotal,
}: {
  property: Property;
  bookings: DiscountBooking[];
  checkIn: string;
  nights: number;
  subtotal: number;
}): AppliedDiscount[] {
  const discounts = getListingDiscounts(property);
  const bookingCount = bookings.filter((booking) => booking.propertyId === property.id && booking.status !== "cancelled").length;
  const candidates: Omit<AppliedDiscount, "amount">[] = [];

  if (discounts.newListing && bookingCount < 3) candidates.push({ key: "newListing", label: "New listing promotion", percent: 20 });
  if (discounts.lastMinute && daysUntil(checkIn) <= 14) candidates.push({ key: "lastMinute", label: "Last-minute discount", percent: 3 });
  if (discounts.weekly && nights >= 7) candidates.push({ key: "weekly", label: "Weekly discount", percent: 10 });
  if (discounts.monthly && nights >= 28) candidates.push({ key: "monthly", label: "Monthly discount", percent: 20 });

  return candidates
    .map((discount) => ({ ...discount, amount: Math.round(subtotal * (discount.percent / 100)) }))
    .sort((a, b) => b.amount - a.amount);
}

export function getBestDiscount(input: Parameters<typeof getApplicableDiscounts>[0]) {
  return getApplicableDiscounts(input)[0] ?? null;
}

export function nightsBetweenDateKeys(checkIn: string, checkOut: string) {
  const checkInTime = dateKeyToUtcTime(checkIn);
  const checkOutTime = dateKeyToUtcTime(checkOut);
  if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime)) return 0;
  return Math.round((checkOutTime - checkInTime) / dayMs);
}

export function isWeekendNight(dateKey: string) {
  const time = dateKeyToUtcTime(dateKey);
  if (!Number.isFinite(time)) return false;
  const day = new Date(time).getUTCDay();
  return isWeekendDayIndex(day);
}

export function isWeekendDayIndex(day: number) {
  return weekendDayIndexes.has(day);
}

export function calculateNightlySubtotal(rates: NightlyRates, checkIn: string, checkOut: string): NightlySubtotal {
  const nights = Math.max(0, nightsBetweenDateKeys(checkIn, checkOut));
  const checkInTime = dateKeyToUtcTime(checkIn);
  let weekdayNights = 0;
  let weekendNights = 0;
  let grossSubtotal = 0;
  let subtotal = 0;
  const rateAdjustmentDiscounts: RateAdjustmentDiscount[] = [];

  if (!Number.isFinite(checkInTime)) return { nights: 0, weekdayNights, weekendNights, grossSubtotal, subtotal, rateAdjustmentDiscounts };

  for (let index = 0; index < nights; index += 1) {
    const dateKey = toDateKeyFromUtcTime(checkInTime + index * dayMs);
    if (isWeekendNight(dateKey)) {
      weekendNights += 1;
    } else {
      weekdayNights += 1;
    }
    const rateDetails = getNightlyRateDetails(rates, dateKey);
    grossSubtotal += rateDetails.grossRate;
    subtotal += rateDetails.netRate;
    if (rateDetails.discountAmount > 0 && rateDetails.discountId) {
      rateAdjustmentDiscounts.push({
        id: rateDetails.discountId,
        label: rateDetails.discountLabel || "Calendar promo",
        date: dateKey,
        amount: rateDetails.discountAmount,
        percent: rateDetails.discountPercent,
      });
    }
  }

  return { nights, weekdayNights, weekendNights, grossSubtotal, subtotal, rateAdjustmentDiscounts };
}

export function isEntirePlaceListing(property: Pick<Property, "privacyType">) {
  return !property.privacyType || property.privacyType === "entire";
}

export function getEnabledBookingPackages(property: Pick<Property, "bookingPackages" | "privacyType">) {
  if (!isEntirePlaceListing(property)) return [];

  return (property.bookingPackages ?? [])
    .filter((item) => item.enabled && item.status !== "inactive")
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));
}

export function getListingBookingType(property: Pick<Property, "bookingType">) {
  return property.bookingType === "package" || property.bookingType === "both" ? property.bookingType : "stay";
}

export function allowsStayBooking(property: Pick<Property, "bookingType">) {
  return getListingBookingType(property) !== "package";
}

export function allowsPackageBooking(property: Pick<Property, "bookingType" | "bookingPackages" | "privacyType">) {
  return getListingBookingType(property) !== "stay" && getEnabledBookingPackages(property).length > 0;
}

export function findBookingPackageById(property: Pick<Property, "bookingPackages" | "privacyType">, packageId?: string | null) {
  if (!packageId) return null;
  return getEnabledBookingPackages(property).find((item) => item.id === packageId) ?? null;
}

export function getBookingPackageById(property: Pick<Property, "bookingPackages" | "privacyType">, packageId?: string | null) {
  const packages = getEnabledBookingPackages(property);
  if (!packages.length) return null;
  return packages.find((item) => item.id === packageId) ?? packages[0];
}

export function getFullAccessBookingPackage(packages: BookingPackage[]) {
  const fullAccessPackage = packages.find((item) => {
    const label = `${item.name} ${item.accessType}`.toLowerCase();
    return item.unit === "night" && label.includes("full access");
  });

  return fullAccessPackage ?? packages.find((item) => item.unit === "night") ?? null;
}

export function calculatePackageSubtotal(pkg: BookingPackage, checkIn: string, checkOut: string, guests: number, extensionHours = 0): PackageSubtotal {
  const { nights, weekdayNights, weekendNights, grossSubtotal, subtotal, rateAdjustmentDiscounts } = calculateNightlySubtotal({
    pricePerNight: pkg.weekdayRate,
    weekendPrice: pkg.weekendRate > 0 ? pkg.weekendRate : pkg.weekdayRate,
    holidayPrice: pkg.holidayRate,
    holidayDates: pkg.holidayDates,
    seasonalRates: pkg.seasonalRates,
  }, checkIn, checkOut);
  const unitCount = nights;
  const extraGuests = Math.max(0, guests - pkg.includedGuests);
  const extraGuestFee = extraGuests * pkg.additionalGuestFee * unitCount;
  const extensionFee = Math.max(0, extensionHours) * pkg.extensionHourlyFee;

  return {
    nights,
    weekdayNights,
    weekendNights,
    unitCount,
    grossSubtotal: grossSubtotal + extraGuestFee + extensionFee,
    subtotal: subtotal + extraGuestFee + extensionFee,
    rateAdjustmentDiscounts,
    extraGuests,
    extraGuestFee,
    extensionFee,
  };
}

export function calculateDefaultWeekendPrice(pricePerNight: number) {
  return Math.round(pricePerNight * (1 + DEFAULT_WEEKEND_PREMIUM_RATE));
}

export function calculateStayprimeMarkup(subtotal: number) {
  return Math.round(subtotal * STAYPRIME_MARKUP_RATE);
}

export function calculateGuestPriceWithMarkup(hostAmount: number) {
  return hostAmount + calculateStayprimeMarkup(hostAmount);
}

function positiveRates(values: Array<number | null | undefined>) {
  return values
    .filter((value): value is number => Number.isFinite(value) && Number(value) > 0)
    .map((value) => Number(value));
}

function seasonalRatesForDisplay(rates: SeasonalRate[] = []) {
  return rates.flatMap((rate) => positiveRates([rate.weekdayRate, rate.weekendRate, rate.holidayRate]));
}

function rateAdjustmentsForDisplay(adjustments: ListingRateAdjustment[] = []) {
  return adjustments.flatMap((adjustment) => (
    adjustment.active !== false && (adjustment.type === "monthly" || adjustment.type === "custom")
      ? positiveRates([adjustment.weekdayRate, adjustment.weekendRate])
      : []
  ));
}

function bookingPackageRatesForDisplay(pkg: BookingPackage) {
  return [
    ...positiveRates([
      pkg.weekdayRate,
      pkg.weekendRate > 0 ? pkg.weekendRate : undefined,
      pkg.holidayRate,
    ]),
    ...seasonalRatesForDisplay(pkg.seasonalRates),
  ];
}

export function formatGuestNightlyPriceRange(
  property: Pick<Property, "pricePerNight" | "weekendPrice" | "holidayPrice" | "seasonalRates" | "rateAdjustments" | "bookingType" | "bookingPackages" | "privacyType">,
) {
  const stayRates = allowsStayBooking(property)
    ? [
        ...positiveRates([property.pricePerNight, property.weekendPrice, property.holidayPrice]),
        ...seasonalRatesForDisplay(property.seasonalRates),
        ...rateAdjustmentsForDisplay(property.rateAdjustments),
      ]
    : [];
  const packageRates = allowsPackageBooking(property)
    ? getEnabledBookingPackages(property).flatMap((pkg) => (pkg.unit === "night" ? bookingPackageRatesForDisplay(pkg) : []))
    : [];
  const rates = Array.from(new Set([...stayRates, ...packageRates])).sort((a, b) => a - b);

  if (!rates.length) return `${formatCurrency(calculateGuestPriceWithMarkup(property.pricePerNight))} / night`;

  const [lowest] = rates;
  const highest = rates[rates.length - 1];
  const lowestLabel = formatCurrency(calculateGuestPriceWithMarkup(lowest));
  const highestLabel = formatCurrency(calculateGuestPriceWithMarkup(highest));

  if (lowest === highest) return `${lowestLabel} / night`;
  return `${lowestLabel} to ${highestLabel} / night`;
}

export function calculateStayprimeMarkupFromTotal(total: number) {
  return Math.round(total * (STAYPRIME_MARKUP_RATE / (1 + STAYPRIME_MARKUP_RATE)));
}

export function calculateHostPayoutFromTotal(total: number) {
  return total - calculateStayprimeMarkupFromTotal(total);
}
