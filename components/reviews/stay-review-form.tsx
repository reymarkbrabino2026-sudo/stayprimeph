"use client";

import { useActionState } from "react";
import { submitStayReview, type ReviewActionState } from "@/app/guest/bookings/actions";
import { csrfFieldName } from "@/lib/csrf-fields";

const initialState: ReviewActionState = {};

export function StayReviewForm({ bookingId, csrfToken }: { bookingId: string; csrfToken: string }) {
  const [state, formAction, pending] = useActionState(submitStayReview, initialState);

  return (
    <form action={formAction} className="mt-6 rounded-[1.5rem] border border-black/10 bg-white p-5">
      <input type="hidden" name={csrfFieldName} value={csrfToken} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <p className="text-lg font-semibold">Review your stay</p>
        <p className="mt-1 text-sm leading-6 text-black/60">
          Share feedback only after a real stay. This review appears on the listing and in the host&apos;s reviews.
        </p>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold">Rating</span>
        <select name="rating" defaultValue="5" className="min-h-12 w-full rounded-2xl border px-4">
          <option value="5">5 stars - Excellent</option>
          <option value="4">4 stars - Good</option>
          <option value="3">3 stars - Okay</option>
          <option value="2">2 stars - Poor</option>
          <option value="1">1 star - Bad</option>
        </select>
      </label>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold">Your experience</span>
        <textarea
          name="comment"
          minLength={20}
          rows={5}
          placeholder="Tell future guests what the stay, listing, and host experience were really like."
          className="w-full rounded-2xl border p-4 outline-none focus:border-black"
          required
        />
      </label>
      {state.error ? <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p> : null}
      <button
        disabled={pending}
        className="mt-5 min-h-12 rounded-full bg-[#083f35] px-6 text-sm font-semibold text-white transition hover:bg-[#062f28] disabled:bg-black/20"
      >
        {pending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
