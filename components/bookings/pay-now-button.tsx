"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { CheckCircle2, Landmark, Loader2, ReceiptText, Smartphone, Upload, X } from "lucide-react";
import { submitManualPaymentDetails, type ManualPaymentActionState } from "@/app/guest/bookings/actions";
import { extractPaymentReferenceFromReceiptText } from "@/lib/payment-receipt-ocr";
import type { Booking, Payment } from "@/lib/types";
import { formatCurrency, formatStayDateRange, formatStayTimeRange } from "@/lib/utils";

const initialState: ManualPaymentActionState = {};
type ReceiptScanStatus = "idle" | "reading" | "found" | "not_found" | "error";
type PaymentStepId = "amount" | "method" | "proof" | "review";

const paymentSteps: Array<{ id: PaymentStepId; label: string }> = [
  { id: "amount", label: "Amount" },
  { id: "method", label: "Method" },
  { id: "proof", label: "Proof" },
  { id: "review", label: "Review" },
];

const tesseractOcrOptions = {
  workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js",
  corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0",
  langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0",
};

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
      {payment.receiptImageUrl ? (
        <div>
          <p className="text-black/45">Receipt screenshot</p>
          <a
            href={payment.receiptImageUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#d85d32]"
          >
            View receipt
          </a>
        </div>
      ) : null}
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
  csrfToken,
}: {
  booking: Booking;
  propertyTitle: string;
  propertyLocation: string;
  payment: Payment | null;
  csrfToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitManualPaymentDetails, initialState);
  const [amount, setAmount] = useState(() => (payment?.paymentStatus === "rejected" ? payment.amount : booking.totalPrice));
  const [paymentPreset, setPaymentPreset] = useState(() => (payment?.paymentStatus === "rejected" ? "custom" : "100"));
  const [method, setMethod] = useState<string>(() => (payment?.paymentStatus === "rejected" && payment.paymentMethod !== "stripe" ? payment.paymentMethod : ""));
  const initialReferenceNumber = payment?.paymentStatus === "rejected" ? payment.transactionId : "";
  const [referenceNumber, setReferenceNumber] = useState(initialReferenceNumber);
  const [notes, setNotes] = useState(() => (payment?.paymentStatus === "rejected" ? payment.notes ?? "" : ""));
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptScanStatus, setReceiptScanStatus] = useState<ReceiptScanStatus>("idle");
  const [receiptScanMessage, setReceiptScanMessage] = useState("");
  const [receiptObjectUrl, setReceiptObjectUrl] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStepId>("amount");
  const [stepMessage, setStepMessage] = useState("");
  const receiptScanId = useRef(0);
  const isSubmitted = payment?.paymentStatus === "submitted";
  const isRejected = payment?.paymentStatus === "rejected";
  const currentStepIndex = paymentSteps.findIndex((step) => step.id === paymentStep);
  const isAmountValid = Number.isFinite(amount) && amount >= 1 && amount <= booking.totalPrice;
  const hasPaymentMethod = method === "gcash" || method === "bank_transfer";
  const hasReceiptImage = Boolean(receiptFileName);
  const hasReferenceNumber = referenceNumber.trim().length > 0;
  const allStepsComplete = isAmountValid && hasPaymentMethod && hasReceiptImage && hasReferenceNumber;
  const remainingBalance = Math.max(booking.totalPrice - amount, 0);
  const selectedMethodLabel = hasPaymentMethod ? methodLabel(method) : "Not selected";

  useEffect(() => () => {
    if (receiptObjectUrl) URL.revokeObjectURL(receiptObjectUrl);
  }, [receiptObjectUrl]);

  function resetReceiptUpload() {
    receiptScanId.current += 1;
    setReferenceNumber(initialReferenceNumber);
    setReceiptFileName("");
    setReceiptScanStatus("idle");
    setReceiptScanMessage("");
    setReceiptObjectUrl(null);
    setStepMessage("");
  }

  function closePaymentModal() {
    setOpen(false);
    setPaymentStep("amount");
    resetReceiptUpload();
  }

  function openPaymentModal() {
    resetReceiptUpload();
    setPaymentStep("amount");
    setOpen(true);
  }

  function stepValidationMessage(stepId: PaymentStepId) {
    if (stepId === "amount" && !isAmountValid) return `Enter an amount from ${formatCurrency(1)} to ${formatCurrency(booking.totalPrice)}.`;
    if (stepId === "method" && !hasPaymentMethod) return "Choose GCash or bank transfer before continuing.";
    if (stepId === "proof" && receiptScanStatus === "reading") return "Wait for the receipt scan to finish before continuing.";
    if (stepId === "proof" && !hasReceiptImage) return "Upload a receipt screenshot before continuing.";
    if (stepId === "proof" && !hasReferenceNumber) return "Enter the receipt number or transaction ID before continuing.";
    return "";
  }

  function goToNextStep() {
    const message = stepValidationMessage(paymentStep);
    if (message) {
      setStepMessage(message);
      return;
    }
    setStepMessage("");
    setPaymentStep(paymentSteps[Math.min(currentStepIndex + 1, paymentSteps.length - 1)].id);
  }

  function goToPreviousStep() {
    setStepMessage("");
    setPaymentStep(paymentSteps[Math.max(currentStepIndex - 1, 0)].id);
  }

  function updateAmountPreset(percent: string) {
    setPaymentPreset(percent);
    setStepMessage("");
    if (percent === "custom") return;
    setAmount(Math.round((booking.totalPrice * Number(percent)) / 100));
  }

  async function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    receiptScanId.current += 1;
    const scanId = receiptScanId.current;
    setReceiptFileName(file?.name ?? "");
    setReferenceNumber("");
    setReceiptScanMessage("");
    setStepMessage("");

    if (!file) {
      setReceiptObjectUrl(null);
      setReceiptScanStatus("idle");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setReceiptObjectUrl(objectUrl);
    setReceiptScanStatus("reading");
    setReceiptScanMessage("Scanning receipt screenshot...");

    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(objectUrl, "eng", tesseractOcrOptions);
      if (receiptScanId.current !== scanId) return;

      const extractedReference = extractPaymentReferenceFromReceiptText(result.data.text);
      if (extractedReference) {
        setReferenceNumber(extractedReference);
        setReceiptScanStatus("found");
        setReceiptScanMessage("Receipt number filled from the screenshot.");
      } else {
        setReceiptScanStatus("not_found");
        setReceiptScanMessage("We could not read a receipt number. Check the screenshot and enter the number below.");
      }
    } catch {
      if (receiptScanId.current !== scanId) return;
      setReceiptScanStatus("error");
      setReceiptScanMessage("We could not scan this screenshot. Check the image and enter the number below.");
    }
  }

  if (isSubmitted && payment) {
    return (
      <section className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="font-semibold text-amber-900">Payment awaiting host confirmation</p>
        <p className="mt-1 text-sm text-amber-900/75">
          Your host will confirm the received payment before this booking is marked as paid.
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
            {payment.rejectionReason ?? "StayPrimePH could not verify this payment."}
          </div>
          <PaymentRecord payment={payment} />
        </section>
      ) : null}

      <button
        type="button"
        onClick={openPaymentModal}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28]"
      >
        <ReceiptText size={18} />
        {isRejected ? "Submit updated payment" : "Pay now"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manual-payment-title">
          <div className="flex h-[92dvh] w-full flex-col rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:mx-auto sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-[1.5rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black/40">External payment</p>
                <h2 id="manual-payment-title" className="mt-2 text-2xl font-bold">Record payment details</h2>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
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

            <ol className="mt-4 grid grid-cols-4 gap-2">
              {paymentSteps.map((step, index) => {
                const active = step.id === paymentStep;
                const complete = index < currentStepIndex;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStepMessage("");
                        setPaymentStep(step.id);
                      }}
                      disabled={index > currentStepIndex}
                      className={`flex h-full w-full flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        active
                          ? "border-[#083f35] bg-[#083f35] text-white"
                          : complete
                            ? "border-[#083f35]/20 bg-[#083f35]/[0.06] text-[#083f35]"
                            : "border-black/10 bg-white text-black/55"
                      }`}
                    >
                      <span className={`grid size-7 place-items-center rounded-full ${active ? "bg-white text-[#083f35]" : "bg-black/[0.06] text-current"}`}>
                        {complete ? <CheckCircle2 size={15} /> : index + 1}
                      </span>
                      <span>{step.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <form action={formAction} encType="multipart/form-data" className="mt-4 flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="bookingId" value={booking.id} />

              <div className="min-h-0 flex-1">
                <section hidden={paymentStep !== "amount"} className="rounded-2xl border border-[#083f35]/25 bg-[#083f35]/[0.04] p-4">
                  <label className="block">
                    <span className="text-sm font-semibold">How much do you want to pay?</span>
                    <select
                      value={paymentPreset}
                      onChange={(event) => updateAmountPreset(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3"
                    >
                      <option value="100">Full payment (100%) - {formatCurrency(booking.totalPrice)}</option>
                      <option value="50">50% downpayment - {formatCurrency(Math.round(booking.totalPrice * 0.5))}</option>
                      <option value="30">30% downpayment - {formatCurrency(Math.round(booking.totalPrice * 0.3))}</option>
                      <option value="custom">Custom amount</option>
                    </select>
                  </label>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">Amount to pay now</span>
                    <input
                      name="amount"
                      type="number"
                      min={1}
                      max={booking.totalPrice}
                      step={1}
                      value={amount}
                      onChange={(event) => {
                        setPaymentPreset("custom");
                        setStepMessage("");
                        setAmount(Number(event.target.value));
                      }}
                      className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3"
                      required
                    />
                  </label>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm text-black/60">You&apos;ll pay now</span>
                    <span className="text-2xl font-bold text-[#083f35]">{formatCurrency(amount || 0)}</span>
                  </div>
                  {amount > 0 && amount < booking.totalPrice ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">Remaining balance {formatCurrency(remainingBalance)} - must be fully paid before check-in.</p>
                  ) : null}
                </section>

                <section hidden={paymentStep !== "method"} className="rounded-2xl border p-4">
                  <label className="block">
                    <span className="text-sm font-semibold">Choose payment method</span>
                    <select
                      name="paymentMethod"
                      value={method}
                      onChange={(event) => {
                        setMethod(event.target.value);
                        setStepMessage("");
                      }}
                      className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3"
                      required
                    >
                      <option value="" disabled>Select a payment method</option>
                      <option value="gcash">GCash</option>
                      <option value="bank_transfer">Bank transfer</option>
                    </select>
                  </label>

                  {hasPaymentMethod ? (
                    <div className="mt-4 rounded-2xl border bg-white p-4 text-center">
                      <div className="flex items-center justify-center gap-2 font-semibold">
                        {method === "gcash" ? <Smartphone size={18} /> : <Landmark size={18} />}
                        {method === "gcash" ? "Scan to pay with GCash" : "Scan to pay via bank transfer"}
                      </div>
                      <p className="mt-2 text-sm text-black/60">
                        Pay exactly <span className="font-bold text-[#083f35]">{formatCurrency(amount || 0)}</span> using the QR code below.
                      </p>
                      <Image
                        src={method === "gcash" ? "/payment-method/gcash-qr.webp" : "/payment-method/bank-transfer-qr.webp"}
                        alt={method === "gcash" ? "GCash payment QR code" : "Bank transfer payment QR code"}
                        width={220}
                        height={220}
                        className="mx-auto mt-3 h-auto max-h-[220px] w-full max-w-[220px] rounded-xl border bg-white object-contain"
                      />
                      {method === "bank_transfer" ? (
                        <p className="mt-2 text-xs text-black/55">Include this booking ID in your transfer note.</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl border border-dashed border-black/15 p-4 text-center text-sm text-black/50">
                      Choose a payment method to see the QR code.
                    </p>
                  )}
                </section>

                <section hidden={paymentStep !== "proof"} className="rounded-2xl border p-4">
                  <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    Payment happens outside StayPrimePH for now. After paying, upload your receipt screenshot and confirm the receipt number.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
                    <div>
                      <span className="text-sm font-semibold">Upload your payment receipt</span>
                      <div className="mt-2 rounded-2xl border border-dashed border-black/20 bg-black/[0.02] p-4">
                        <input
                          id={`receiptImage-${booking.id}`}
                          name="receiptImage"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={handleReceiptChange}
                          className="sr-only"
                          required
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold">{receiptFileName || "Receipt screenshot"}</p>
                            <p className="mt-1 text-sm text-black/55">JPG, PNG, WebP, or AVIF up to 4 MB.</p>
                          </div>
                          <label
                            htmlFor={`receiptImage-${booking.id}`}
                            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-semibold transition hover:bg-black/[0.04]"
                          >
                            <Upload size={17} />
                            Choose
                          </label>
                        </div>
                      </div>
                      {receiptScanMessage ? (
                        <p className={`mt-2 flex items-center gap-2 text-sm ${
                          receiptScanStatus === "found"
                            ? "text-emerald-700"
                            : receiptScanStatus === "reading"
                              ? "text-black/60"
                              : "text-amber-800"
                        }`}
                        >
                          {receiptScanStatus === "reading" ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : receiptScanStatus === "found" ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <ReceiptText size={16} />
                          )}
                          {receiptScanMessage}
                        </p>
                      ) : null}
                    </div>

                    <div className="hidden overflow-hidden rounded-2xl border bg-black/[0.03] sm:block">
                      {receiptObjectUrl ? (
                        <div
                          aria-label="Receipt preview"
                          className="h-full min-h-[220px] w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${receiptObjectUrl})` }}
                        />
                      ) : (
                        <div className="grid h-full min-h-[180px] place-items-center p-4 text-center text-xs text-black/45">Receipt preview</div>
                      )}
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">Receipt number or transaction ID</span>
                    <input
                      name="referenceNumber"
                      className="mt-2 min-h-12 w-full rounded-xl border px-3"
                      placeholder="Auto-filled after receipt upload"
                      value={referenceNumber}
                      onChange={(event) => {
                        setReferenceNumber(event.target.value);
                        setStepMessage("");
                      }}
                      required
                    />
                    <p className="mt-1 text-xs text-black/50">Review the generated number before submitting.</p>
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold">Notes (optional)</span>
                    <textarea
                      name="notes"
                      rows={2}
                      className="mt-2 w-full rounded-xl border px-3 py-3"
                      placeholder="Account name used, or other payment notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                </section>

                <section hidden={paymentStep !== "review"} className="rounded-2xl border p-4">
                  <h3 className="font-semibold">Review payment details</h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-black/[0.03] p-3">
                      <dt className="text-black/45">Amount</dt>
                      <dd className="mt-1 font-semibold">{formatCurrency(amount || 0)}</dd>
                    </div>
                    <div className="rounded-xl bg-black/[0.03] p-3">
                      <dt className="text-black/45">Method</dt>
                      <dd className="mt-1 font-semibold">{selectedMethodLabel}</dd>
                    </div>
                    <div className="rounded-xl bg-black/[0.03] p-3">
                      <dt className="text-black/45">Receipt</dt>
                      <dd className="mt-1 truncate font-semibold">{receiptFileName || "Not uploaded"}</dd>
                    </div>
                    <div className="rounded-xl bg-black/[0.03] p-3">
                      <dt className="text-black/45">Reference</dt>
                      <dd className="mt-1 break-words font-semibold">{referenceNumber || "Missing"}</dd>
                    </div>
                  </dl>
                  {notes ? (
                    <div className="mt-3 rounded-xl bg-black/[0.03] p-3 text-sm">
                      <p className="text-black/45">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap">{notes}</p>
                    </div>
                  ) : null}
                </section>
              </div>

              {stepMessage ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{stepMessage}</p> : null}
              {state.error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p> : null}

              <div className="mt-4 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="min-h-12 rounded-full border px-5 font-semibold transition hover:bg-black/[0.04]"
                >
                  Cancel
                </button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  {currentStepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="min-h-12 rounded-full border px-5 font-semibold transition hover:bg-black/[0.04]"
                    >
                      Back
                    </button>
                  ) : null}
                  {currentStepIndex < paymentSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28]"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={pending || receiptScanStatus === "reading" || !allStepsComplete}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#083f35] px-5 font-semibold text-white transition hover:bg-[#062f28] disabled:opacity-60"
                    >
                      <ReceiptText size={18} />
                      {pending ? "Submitting..." : receiptScanStatus === "reading" ? "Reading receipt..." : "Submit payment details"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
