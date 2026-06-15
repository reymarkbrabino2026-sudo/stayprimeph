"use client";

import { create } from "zustand";
import { calculateStayprimeMarkup, STAYPRIME_MARKUP_RATE } from "@/lib/pricing";

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
  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = new Date(checkOut).getTime();
  if (!Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime)) return 0;
  return Math.round((checkOutTime - checkInTime) / 86400000);
}

export interface PriceBreakdown {
  nights: number;
  validStay: boolean;
  subtotal: number;
  serviceFee: number;
  total: number;
}

export function computePrice(pricePerNight: number, checkIn: string, checkOut: string): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);
  const validStay = nights >= 1;
  const subtotal = pricePerNight * Math.max(nights, 0);
  const serviceFee = validStay ? calculateStayprimeMarkup(subtotal) : 0;
  return { nights, validStay, subtotal, serviceFee, total: subtotal + serviceFee };
}

export function buildReserveHref(propertyId: string, checkIn: string, checkOut: string, guests: number) {
  return `/bookings/checkout/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
}

interface ReservationState {
  checkIn: string;
  checkOut: string;
  guests: number;
  setCheckIn: (value: string) => void;
  setCheckOut: (value: string) => void;
  setGuests: (value: number) => void;
  reset: () => void;
}

export const useReservationStore = create<ReservationState>((set) => ({
  checkIn: DEFAULT_CHECK_IN,
  checkOut: DEFAULT_CHECK_OUT,
  guests: 1,
  setCheckIn: (checkIn) => set({ checkIn }),
  setCheckOut: (checkOut) => set({ checkOut }),
  setGuests: (guests) => set({ guests: Math.max(1, guests) }),
  reset: () => set({ checkIn: DEFAULT_CHECK_IN, checkOut: DEFAULT_CHECK_OUT, guests: 1 }),
}));
