"use client";

import { useEffect, useRef, useState } from "react";

function overlapsBooked(checkIn: string, checkOut: string, ranges: { checkIn: string; checkOut: string }[]) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  // Half-open overlap: [checkIn, checkOut) intersects [range.checkIn, range.checkOut).
  return ranges.some((range) => checkIn < range.checkOut && checkOut > range.checkIn);
}

export function CheckoutDates({
  initialCheckIn,
  initialCheckOut,
  minDate,
  unavailableRanges,
  checkInTime,
  checkOutTime,
}: {
  initialCheckIn: string;
  initialCheckOut: string;
  minDate: string;
  unavailableRanges: { checkIn: string; checkOut: string }[];
  checkInTime: string;
  checkOutTime: string;
}) {
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const checkOutRef = useRef<HTMLInputElement>(null);

  const conflict = overlapsBooked(checkIn, checkOut, unavailableRanges);

  // Block the form from submitting booked dates (native constraint validation).
  useEffect(() => {
    checkOutRef.current?.setCustomValidity(
      conflict ? "These dates overlap an existing booking. Choose another stay window." : "",
    );
  }, [conflict]);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block rounded-2xl border p-4">
        <span className="block text-sm font-semibold">Check-in</span>
        <span className="mt-1 block text-xs text-black/50">Check-in {checkInTime}</span>
        <input
          name="checkIn"
          type="date"
          min={minDate}
          value={checkIn}
          onChange={(event) => setCheckIn(event.target.value)}
          className={`mt-3 min-h-11 w-full rounded-xl border px-3 ${conflict ? "border-rose-300" : ""}`}
          required
        />
      </label>
      <label className="block rounded-2xl border p-4">
        <span className="block text-sm font-semibold">Check-out</span>
        <span className="mt-1 block text-xs text-black/50">Check-out {checkOutTime}</span>
        <input
          ref={checkOutRef}
          name="checkOut"
          type="date"
          min={checkIn || minDate}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
          className={`mt-3 min-h-11 w-full rounded-xl border px-3 ${conflict ? "border-rose-300" : ""}`}
          required
        />
      </label>
      {conflict ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-2">
          These dates overlap an existing booking. Please choose another stay window.
        </p>
      ) : null}
    </div>
  );
}
