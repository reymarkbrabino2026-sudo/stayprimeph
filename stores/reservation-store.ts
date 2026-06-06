"use client";

import { create } from "zustand";

export const SERVICE_FEE_RATE = 0.12;
export const DEFAULT_CHECK_IN = "2026-06-08";
export const DEFAULT_CHECK_OUT = "2026-06-13";
export const TODAY = "2026-05-27";

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
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
  const serviceFee = validStay ? Math.round(subtotal * SERVICE_FEE_RATE) : 0;
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
