import type { Booking, BookingPackage, ListingDiscounts, Property } from "@/lib/types";

export const STAYPRIME_MARKUP_RATE = 0.2;
export const DEFAULT_WEEKEND_PREMIUM_RATE = 0.2;

export interface AppliedDiscount {
  key: keyof ListingDiscounts;
  label: string;
  percent: number;
  amount: number;
}

export interface NightlyRates {
  pricePerNight: number;
  weekendPrice?: number | null;
}

export interface NightlySubtotal {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  subtotal: number;
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
  bookings: Booking[];
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
  const weekdayRate = rates.pricePerNight;
  const weekendRate = Number.isFinite(rates.weekendPrice) && Number(rates.weekendPrice) > 0
    ? Number(rates.weekendPrice)
    : calculateDefaultWeekendPrice(weekdayRate);
  const checkInTime = dateKeyToUtcTime(checkIn);
  let weekdayNights = 0;
  let weekendNights = 0;
  let subtotal = 0;

  if (!Number.isFinite(checkInTime)) return { nights: 0, weekdayNights, weekendNights, subtotal };

  for (let index = 0; index < nights; index += 1) {
    const dateKey = toDateKeyFromUtcTime(checkInTime + index * dayMs);
    if (isWeekendNight(dateKey)) {
      weekendNights += 1;
      subtotal += weekendRate;
    } else {
      weekdayNights += 1;
      subtotal += weekdayRate;
    }
  }

  return { nights, weekdayNights, weekendNights, subtotal };
}

export function getEnabledBookingPackages(property: Pick<Property, "bookingPackages">) {
  return (property.bookingPackages ?? []).filter((item) => item.enabled);
}

export function getBookingPackageById(property: Pick<Property, "bookingPackages">, packageId?: string | null) {
  const packages = getEnabledBookingPackages(property);
  if (!packages.length) return null;
  return packages.find((item) => item.id === packageId) ?? packages[0];
}

export function calculatePackageSubtotal(pkg: BookingPackage, checkIn: string, checkOut: string, guests: number, extensionHours = 0): PackageSubtotal {
  const { nights, weekdayNights, weekendNights, subtotal } = calculateNightlySubtotal({
    pricePerNight: pkg.weekdayRate,
    weekendPrice: pkg.weekendRate > 0 ? pkg.weekendRate : pkg.weekdayRate,
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
    subtotal: subtotal + extraGuestFee + extensionFee,
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

export function calculateStayprimeMarkupFromTotal(total: number) {
  return Math.round(total * (STAYPRIME_MARKUP_RATE / (1 + STAYPRIME_MARKUP_RATE)));
}

export function calculateHostPayoutFromTotal(total: number) {
  return total - calculateStayprimeMarkupFromTotal(total);
}
