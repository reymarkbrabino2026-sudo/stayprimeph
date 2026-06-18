"use client";

import { create } from "zustand";
import {
  calculateNightlySubtotal,
  calculatePackageSubtotal,
  calculateStayprimeMarkup,
  getBookingPackageById,
  nightsBetweenDateKeys,
  STAYPRIME_MARKUP_RATE,
  type NightlyRates,
} from "@/lib/pricing";
import type { Property } from "@/lib/types";

export const SERVICE_FEE_RATE = STAYPRIME_MARKUP_RATE;
export const TODAY = toDateKey(new Date());
export const DEFAULT_CHECK_IN = TODAY;
export const DEFAULT_CHECK_OUT = addDaysToDateKey(DEFAULT_CHECK_IN, 1);

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
  serviceFee: number;
  total: number;
}

export function computePrice(rates: NightlyRates | Property | number, checkIn: string, checkOut: string, guests = 1, packageId?: string | null): PriceBreakdown {
  const bookingPackage = typeof rates === "object" && "bookingPackages" in rates ? getBookingPackageById(rates, packageId) : null;
  const nightlyRates = typeof rates === "number" ? { pricePerNight: rates } : rates;
  const nightlySubtotal = bookingPackage
    ? calculatePackageSubtotal(bookingPackage, checkIn, checkOut, guests)
    : calculateNightlySubtotal(nightlyRates, checkIn, checkOut);
  const { nights, weekdayNights, weekendNights, subtotal } = nightlySubtotal;
  const validStay = nights >= 1;
  const serviceFee = validStay ? calculateStayprimeMarkup(subtotal) : 0;
  return { nights, weekdayNights, weekendNights, validStay, subtotal, serviceFee, total: subtotal + serviceFee };
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
  packageId: string | null;
  setCheckIn: (value: string) => void;
  setCheckOut: (value: string) => void;
  setGuests: (value: number) => void;
  setPackageId: (value: string | null) => void;
  reset: () => void;
}

export const useReservationStore = create<ReservationState>((set) => ({
  checkIn: DEFAULT_CHECK_IN,
  checkOut: DEFAULT_CHECK_OUT,
  guests: 1,
  packageId: null,
  setCheckIn: (checkIn) => set({ checkIn }),
  setCheckOut: (checkOut) => set({ checkOut }),
  setGuests: (guests) => set({ guests: Math.max(1, guests) }),
  setPackageId: (packageId) => set({ packageId }),
  reset: () => set({ checkIn: DEFAULT_CHECK_IN, checkOut: DEFAULT_CHECK_OUT, guests: 1, packageId: null }),
}));
