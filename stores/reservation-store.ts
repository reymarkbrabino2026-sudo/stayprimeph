"use client";

import { create } from "zustand";
import {
  calculateGuestPriceWithMarkup,
  calculateNightlySubtotal,
  calculatePackageSubtotal,
  calculateStayprimeMarkup,
  findBookingPackageById,
  getBestDiscount,
  nightsBetweenDateKeys,
  STAYPRIME_MARKUP_RATE,
  type AppliedDiscount,
  type DiscountBooking,
  type NightlyRates,
} from "@/lib/pricing";
import type { Property } from "@/lib/types";

export const SERVICE_FEE_RATE = STAYPRIME_MARKUP_RATE;
export const TODAY = toDateKey(new Date());
export const DEFAULT_CHECK_IN = TODAY;
export const DEFAULT_CHECK_OUT = addDaysToDateKey(DEFAULT_CHECK_IN, 1);
export type ReservationBookingMode = "stay" | "package";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return nightsBetweenDateKeys(checkIn, checkOut);
}

export interface PriceBreakdown {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  validStay: boolean;
  subtotal: number;
  discountedSubtotal: number;
  discount: AppliedDiscount | null;
  guestSubtotal: number;
  guestDiscountAmount: number;
  serviceFee: number;
  total: number;
}

export function computePrice(
  rates: NightlyRates | Property | number,
  checkIn: string,
  checkOut: string,
  guests = 1,
  packageId?: string | null,
  bookings: DiscountBooking[] = [],
): PriceBreakdown {
  const property = typeof rates === "object" && "id" in rates ? rates : null;
  const bookingPackage = property ? findBookingPackageById(property, packageId) : null;
  const nightlyRates = typeof rates === "number" ? { pricePerNight: rates } : rates;
  const nightlySubtotal = bookingPackage
    ? calculatePackageSubtotal(bookingPackage, checkIn, checkOut, guests)
    : calculateNightlySubtotal(nightlyRates, checkIn, checkOut);
  const { nights, weekdayNights, weekendNights, subtotal } = nightlySubtotal;
  const validStay = nights >= 1;
  const discount = validStay && property ? getBestDiscount({ property, bookings, checkIn, nights, subtotal }) : null;
  const discountedSubtotal = validStay ? Math.max(0, subtotal - (discount?.amount ?? 0)) : 0;
  const serviceFee = validStay ? calculateStayprimeMarkup(discountedSubtotal) : 0;
  const total = discountedSubtotal + serviceFee;
  const guestSubtotal = validStay ? calculateGuestPriceWithMarkup(subtotal) : 0;
  const guestDiscountAmount = discount ? Math.max(0, guestSubtotal - total) : 0;

  return {
    nights,
    weekdayNights,
    weekendNights,
    validStay,
    subtotal,
    discountedSubtotal,
    discount,
    guestSubtotal,
    guestDiscountAmount,
    serviceFee,
    total,
  };
}

export function buildReserveHref(propertyId: string, checkIn: string, checkOut: string, guests: number, packageId?: string | null) {
  const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  if (packageId) params.set("packageId", packageId);
  return `/bookings/checkout/${propertyId}?${params.toString()}`;
}

interface ReservationState {
  checkIn: string;
  checkOut: string;
  guests: number;
  bookingMode: ReservationBookingMode;
  packageId: string | null;
  setCheckIn: (value: string) => void;
  setCheckOut: (value: string) => void;
  setGuests: (value: number) => void;
  setBookingMode: (value: ReservationBookingMode) => void;
  setPackageId: (value: string | null) => void;
  reset: () => void;
}

export const useReservationStore = create<ReservationState>((set) => ({
  checkIn: DEFAULT_CHECK_IN,
  checkOut: DEFAULT_CHECK_OUT,
  guests: 1,
  bookingMode: "stay",
  packageId: null,
  setCheckIn: (checkIn) => set((state) => (state.checkIn === checkIn ? state : { checkIn })),
  setCheckOut: (checkOut) => set((state) => (state.checkOut === checkOut ? state : { checkOut })),
  setGuests: (guests) => set((state) => {
    const nextGuests = Math.max(1, guests);
    return state.guests === nextGuests ? state : { guests: nextGuests };
  }),
  setBookingMode: (bookingMode) => set((state) => (state.bookingMode === bookingMode ? state : { bookingMode })),
  setPackageId: (packageId) => set((state) => (state.packageId === packageId ? state : { packageId })),
  reset: () => set({
    checkIn: DEFAULT_CHECK_IN,
    checkOut: DEFAULT_CHECK_OUT,
    guests: 1,
    bookingMode: "stay",
    packageId: null,
  }),
}));
