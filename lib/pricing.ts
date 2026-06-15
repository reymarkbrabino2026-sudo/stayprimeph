import type { Booking, ListingDiscounts, Property } from "@/lib/types";

export const STAYPRIME_MARKUP_RATE = 0.2;

export interface AppliedDiscount {
  key: keyof ListingDiscounts;
  label: string;
  percent: number;
  amount: number;
}

const defaultDiscounts: ListingDiscounts = { newListing: false, lastMinute: false, weekly: false, monthly: false };

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

export function calculateStayprimeMarkup(subtotal: number) {
  return Math.round(subtotal * STAYPRIME_MARKUP_RATE);
}
