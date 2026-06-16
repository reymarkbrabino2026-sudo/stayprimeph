"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { cancelGuestBooking, type CancellationActionState } from "@/app/guest/bookings/actions";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

const initialState: CancellationActionState = {};

export function BookingCancellationForm({
  bookingId,
  propertyTitle,
  checkIn,
  checkOut,
  totalPrice,
  requiresReview,
}: {
  bookingId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  requiresReview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(cancelGuestBooking, initialState);

  return (
    <div className="mt-6 border-t pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Need to cancel?</p>
          <p className="mt-1 text-sm leading-6 text-black/60">
            You can cancel before check-in. Paid or submitted payments may need review before any refund is processed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 shrink-0 rounded-full border border-rose-200 px-5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          Cancel booking
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-xl sm:rounded-[1.5rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600">Cancellation</p>
                <h2 id="cancel-booking-title" className="mt-2 text-2xl font-bold">Cancel this booking?</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full border bg-white text-black/65 transition hover:bg-black/[0.04]"
                aria-label="Close cancellation form"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#fbf7f2] p-4">
              <h3 className="font-semibold">{propertyTitle}</h3>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-black/45">Dates</p>
                  <p className="font-semibold">{formatStayDateRange(checkIn, checkOut)}</p>
                  <p className="mt-1 text-xs text-black/50">{formatStayTimeRange()}</p>
                </div>
                <div>
                  <p className="text-black/45">Total</p>
                  <p className="font-semibold">{formatCurrency(totalPrice)}</p>
                </div>
                <div>
                  <p className="text-black/45">Refund</p>
                  <p className="font-semibold">{requiresReview ? "Review required" : "No payment captured"}</p>
                </div>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Cancelling will release these dates for other guests. This action cannot be undone from your dashboard.
            </p>

            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="bookingId" value={bookingId} />
              <label className="block">
                <span className="text-sm font-semibold">Reason for cancellation</span>
                <textarea
                  name="reason"
                  rows={4}
                  maxLength={500}
                  className="mt-2 w-full rounded-xl border px-3 py-3 outline-none transition focus:border-rose-400"
                  placeholder="Optional, but helpful for the host and support team."
                />
              </label>

              {state.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-12 rounded-full border px-5 font-semibold transition hover:bg-black/[0.04]"
                >
                  Keep booking
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-12 rounded-full bg-rose-700 px-5 font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
                >
                  {pending ? "Cancelling..." : "Confirm cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
