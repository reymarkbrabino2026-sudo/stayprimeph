'use client';

import type { Property } from "@/lib/types";
import { STANDARD_CHECK_IN_TIME, STANDARD_CHECK_OUT_TIME, formatCurrency } from "@/lib/utils";
import { calculateGuestPriceWithMarkup, calculateStayprimeMarkup } from "@/lib/pricing";

export function BookingCard({ property }: { property: Property }) {
  const nights = 4;
  const stayTotal = property.pricePerNight * nights;
  const fee = calculateStayprimeMarkup(stayTotal);
  const guestNightlyPrice = calculateGuestPriceWithMarkup(property.pricePerNight);
  const guestTotal = stayTotal + fee;

  return (
    <aside className="sticky top-6 h-fit rounded-[1.75rem] bg-white p-5 soft-card">
      <div className="flex items-end justify-between">
        <p>
          <span className="text-2xl font-bold">{formatCurrency(guestNightlyPrice)}</span> / night
        </p>
        <p className="text-sm">★ {property.rating}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border">
        <div className="p-4">
          <p className="text-xs">Check-in</p>
          <p className="font-semibold">Jun 12</p>
          <p className="mt-1 text-xs text-black/50">{STANDARD_CHECK_IN_TIME}</p>
        </div>
        <div className="border-l p-4">
          <p className="text-xs">Check-out</p>
          <p className="font-semibold">Jun 16</p>
          <p className="mt-1 text-xs text-black/50">{STANDARD_CHECK_OUT_TIME}</p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border p-4">
        <p className="text-xs">Guests</p>
        <p className="font-semibold">2 guests</p>
      </div>
      <button onClick={() => window.alert("Booking flow will be connected next.")} className="mt-5 w-full rounded-2xl bg-[#d85d32] py-4 font-semibold text-white">
        Reserve
      </button>
      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span>
            {formatCurrency(guestNightlyPrice)} × {nights} nights
          </span>
          <span>{formatCurrency(guestTotal)}</span>
        </div>
        <div className="flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>{formatCurrency(guestTotal)}</span>
        </div>
      </div>
    </aside>
  );
}
