"use client";

import { useState } from "react";
import { CreditCard, Loader2, ReceiptText, X } from "lucide-react";
import type { Booking, Payment } from "@/lib/types";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

function formatSubmittedAt(value?: string) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function methodLabel(method?: string) {
  if (method === "stripe") return "Stripe";
  if (method === "gcash") return "Legacy manual payment";
  if (method === "bank_transfer") return "Legacy manual payment";
  return "Legacy payment";
}

function PaymentRecord({ payment }: { payment: Payment }) {
  return (
    <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 text-sm sm:grid-cols-2">
      <div>
        <p className="text-black/45">Method</p>
        <p className="font-semibold">{methodLabel(payment.paymentMethod)}</p>
      </div>
      <div>
        <p className="text-black/45">Amount</p>
        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
      </div>
      <div>
        <p className="text-black/45">Transaction ID</p>
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
  payment,
  stripeReady,
}: {
  booking: Booking;
  propertyTitle: string;
  propertyLocation: string;
  payment: Payment | null;
  stripeReady: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [stripePending, setStripePending] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const isSubmitted = payment?.paymentStatus === "submitted";
  const isRejected = payment?.paymentStatus === "rejected";

  async function startStripeCheckout() {
    setStripeError(null);
    setStripePending(true);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Stripe checkout could not be started.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setStripeError(error instanceof Error ? error.message : "Stripe checkout could not be started.");
      setStripePending(false);
    }
  }

  if (isSubmitted && payment) {
    return (
      <section className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="font-semibold text-amber-900">Payment awaiting platform verification</p>
        <p className="mt-1 text-sm text-amber-900/75">
          This legacy payment record can only be finalized by a platform admin.
        </p>
        <PaymentRecord payment={payment} />
      </section>
    );
  }

  return (
    <div className="mt-6">
      {isRejected && payment ? (
        <section className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-5">
          <p className="font-semibold text-rose-800">Previous payment was rejected</p>
          <p className="mt-1 text-sm text-rose-800/75">Use secure online checkout to complete this booking.</p>
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-rose-800">
            {payment.rejectionReason ?? "The platform could not verify this payment."}
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
        Pay now
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="stripe-payment-title">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-[1.5rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">Payment</p>
                <h2 id="stripe-payment-title" className="mt-2 text-2xl font-bold">Secure checkout</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full border bg-white text-black/65 transition hover:bg-black/[0.04]"
                aria-label="Close payment checkout"
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
                  <p className="font-semibold">{formatStayDateRange(booking.checkIn, booking.checkOut)}</p>
                  <p className="mt-1 text-xs text-black/50">{formatStayTimeRange()}</p>
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

            {stripeReady ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#083f35]">
                      <CreditCard size={20} />
                    </span>
                    <div>
                      <p className="font-semibold text-emerald-900">Stripe checkout</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                        Pay securely online. The booking is confirmed only after Stripe verifies payment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startStripeCheckout}
                    disabled={stripePending}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] disabled:opacity-60"
                  >
                    {stripePending ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                    Pay {formatCurrency(booking.totalPrice)}
                  </button>
                </div>
                {stripeError ? <p className="mt-3 rounded-xl bg-white p-3 text-sm text-rose-700">{stripeError}</p> : null}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Paid bookings are disabled until StayPrimePH launches a verified payment provider.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
