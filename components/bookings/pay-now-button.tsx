"use client";

import { useActionState, useState } from "react";
import { Landmark, ReceiptText, Smartphone, X } from "lucide-react";
import { submitManualPaymentDetails, type ManualPaymentActionState } from "@/app/guest/bookings/actions";
import type { Booking, Payment } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const initialState: ManualPaymentActionState = {};

function formatSubmittedAt(value?: string) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function methodLabel(method?: string) {
  if (method === "gcash") return "GCash";
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "stripe") return "Stripe";
  return "Other";
}

function PaymentRecord({ payment }: { payment: Payment }) {
  return (
    <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 text-sm sm:grid-cols-2">
      <div>
        <p className="text-black/45">Method</p>
        <p className="font-semibold">{methodLabel(payment.paymentMethod)}</p>
      </div>
      <div>
        <p className="text-black/45">Amount submitted</p>
        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
      </div>
      <div>
        <p className="text-black/45">Reference number</p>
        <p className="break-words font-semibold">{payment.transactionId}</p>
      </div>
      <div>
        <p className="text-black/45">Submitted</p>
        <p className="font-semibold">{formatSubmittedAt(payment.submittedAt ?? payment.createdAt)}</p>
      </div>
      {payment.notes ? (
        <div className="sm:col-span-2">
          <p className="text-black/45">Notes</p>
          <p className="whitespace-pre-wrap">{payment.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PayNowButton({
  booking,
  propertyTitle,
  propertyLocation,
  hostName,
  payment,
}: {
  booking: Booking;
  propertyTitle: string;
  propertyLocation: string;
  hostName: string;
  payment: Payment | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitManualPaymentDetails, initialState);
  const isSubmitted = payment?.paymentStatus === "submitted";
  const isRejected = payment?.paymentStatus === "rejected";
  const defaultPaymentMethod =
    isRejected && (payment?.paymentMethod === "gcash" || payment?.paymentMethod === "bank_transfer" || payment?.paymentMethod === "other")
      ? payment.paymentMethod
      : "gcash";

  if (isSubmitted && payment) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-800">Payment submitted</p>
        <p className="mt-1 text-sm text-emerald-800/75">
          Waiting for host confirmation. Your booking will be approved once {hostName} confirms the transfer.
        </p>
        <PaymentRecord payment={payment} />
      </section>
    );
  }

  return (
    <div className="mt-6">
      {isRejected && payment ? (
        <section className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-5">
          <p className="font-semibold text-rose-800">Payment was rejected</p>
          <p className="mt-1 text-sm text-rose-800/75">
            Please check the reason below and submit updated payment details.
          </p>
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-rose-800">
            {payment.rejectionReason ?? "The host could not verify this payment."}
          </div>
          <PaymentRecord payment={payment} />
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28]"
      >
        <ReceiptText size={18} />
        {isRejected ? "Submit updated payment" : "Pay now"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manual-payment-title">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-[1.5rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">External payment</p>
                <h2 id="manual-payment-title" className="mt-2 text-2xl font-bold">Record payment details</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full border bg-white text-black/65 transition hover:bg-black/[0.04]"
                aria-label="Close payment form"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#fbf7f2] p-4">
              <h3 className="font-semibold">{propertyTitle}</h3>
              <p className="mt-1 text-sm text-black/55">{propertyLocation}</p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-black/45">Dates</p>
                  <p className="font-semibold">{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                </div>
                <div>
                  <p className="text-black/45">Guests</p>
                  <p className="font-semibold">{booking.guests}</p>
                </div>
                <div>
                  <p className="text-black/45">Total due</p>
                  <p className="font-semibold">{formatCurrency(booking.totalPrice)}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone size={18} />
                  GCash
                </div>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Send the transfer using the host-provided GCash details, then enter the transaction reference here.
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Landmark size={18} />
                  Bank transfer
                </div>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Complete the bank transfer outside StayPrimePH and include this booking ID in your transfer note.
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Payment happens outside StayPrimePH for now. This form records the transaction so {hostName} can confirm receipt and approve the booking.
            </p>

            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="bookingId" value={booking.id} />

              <label className="block">
                <span className="text-sm font-semibold">Payment method</span>
                <select name="paymentMethod" defaultValue={defaultPaymentMethod} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3" required>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Amount paid</span>
                <input
                  name="amount"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={payment?.paymentStatus === "rejected" ? payment.amount : booking.totalPrice}
                  className="mt-2 min-h-12 w-full rounded-xl border px-3"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Reference number or transaction ID</span>
                <input
                  name="referenceNumber"
                  className="mt-2 min-h-12 w-full rounded-xl border px-3"
                  placeholder="Example: GCash or bank reference number"
                  defaultValue={payment?.paymentStatus === "rejected" ? payment.transactionId : ""}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                  placeholder="Optional proof link, account name used, or other payment notes"
                  defaultValue={payment?.paymentStatus === "rejected" ? payment.notes : ""}
                />
              </label>

              {state.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-12 rounded-full border px-5 font-semibold transition hover:bg-black/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] disabled:opacity-60"
                >
                  <ReceiptText size={18} />
                  {pending ? "Submitting..." : "Submit payment details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
