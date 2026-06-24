-- Manual downpayments can confirm a booking before the full balance is paid.
-- Keep the database constraints aligned with the app's PaymentStatus union.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_payment_status_check') THEN
    ALTER TABLE "Booking" DROP CONSTRAINT "Booking_payment_status_check";
  END IF;
END $$;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_payment_status_check"
  CHECK ("paymentStatus" IN ('pending', 'submitted', 'paid', 'partially_paid', 'rejected', 'refunded'))
  NOT VALID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_method_status_check') THEN
    ALTER TABLE "Payment" DROP CONSTRAINT "Payment_method_status_check";
  END IF;
END $$;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_method_status_check"
  CHECK (
    "paymentMethod" IN ('stripe', 'gcash', 'bank_transfer', 'other')
    AND "paymentStatus" IN ('pending', 'submitted', 'paid', 'partially_paid', 'rejected', 'refunded')
  )
  NOT VALID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_lifecycle_timestamps_check') THEN
    ALTER TABLE "Payment" DROP CONSTRAINT "Payment_lifecycle_timestamps_check";
  END IF;
END $$;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_lifecycle_timestamps_check"
  CHECK (
    ("paymentStatus" <> 'submitted' OR "submittedAt" IS NOT NULL)
    AND ("paymentStatus" NOT IN ('paid', 'partially_paid') OR "confirmedAt" IS NOT NULL)
    AND ("paymentStatus" <> 'rejected' OR ("rejectedAt" IS NOT NULL AND length(btrim(COALESCE("rejectionReason", ''))) > 0))
    AND ("paymentStatus" <> 'refunded' OR ("confirmedAt" IS NOT NULL OR "submittedAt" IS NOT NULL))
  )
  NOT VALID;
