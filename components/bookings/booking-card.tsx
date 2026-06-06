'use client';

import type { Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function BookingCard({ property }: { property: Property }) {
  const nights = 4;
  const stayTotal = property.pricePerNight * nights;
  const fee = Math.round(stayTotal * 0.1);

  return (
    <aside className="sticky top-6 h-fit rounded-[1.75rem] bg-white p-5 soft-card">
      <div className="flex items-end justify-between">
        <p>
          <span className="text-2xl font-bold">{formatCurrency(property.pricePerNight)}</span> / night
        </p>
        <p className="text-sm">★ {property.rating}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border">
        <div className="p-4">
          <p className="text-xs">Check-in</p>
          <p className="font-semibold">Jun 12</p>
        </div>
        <div className="border-l p-4">
          <p className="text-xs">Check-out</p>
          <p className="font-semibold">Jun 16</p>
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
            {formatCurrency(property.pricePerNight)} × {nights} nights
          </span>
          <span>{formatCurrency(stayTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service fee</span>
          <span>{formatCurrency(fee)}</span>
        </div>
        <div className="flex justify-between border-t pt-3 font-bold">
          <span>Total</span>
          <span>{formatCurrency(stayTotal + fee)}</span>
        </div>
      </div>
    </aside>
  );
}
