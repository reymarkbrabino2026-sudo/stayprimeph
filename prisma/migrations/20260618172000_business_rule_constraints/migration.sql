-- Add database-level invariants for business rules that must survive bugs,
-- race conditions, and direct database writes.
--
-- Most checks are added NOT VALID so production starts enforcing new writes
-- without requiring legacy rows to be clean before this migration can deploy.
-- After production data is audited, run ALTER TABLE ... VALIDATE CONSTRAINT
-- for each NOT VALID constraint.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_role_check') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_role_check"
      CHECK ("role" IN ('guest', 'host', 'admin', 'super_admin'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_email_not_blank_check') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_email_not_blank_check"
      CHECK (length(btrim("email")) > 0 AND position('@' in "email") > 1)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Property_status_check') THEN
    ALTER TABLE "Property"
      ADD CONSTRAINT "Property_status_check"
      CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Property_listing_numbers_check') THEN
    ALTER TABLE "Property"
      ADD CONSTRAINT "Property_listing_numbers_check"
      CHECK (
        "pricePerNight" > 0
        AND "bedrooms" >= 0
        AND "bathrooms" > 0
        AND "maxGuests" BETWEEN 1 AND 500
        AND "rating" BETWEEN 0 AND 5
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Property_required_text_check') THEN
    ALTER TABLE "Property"
      ADD CONSTRAINT "Property_required_text_check"
      CHECK (
        length(btrim("slug")) > 0
        AND length(btrim("title")) > 0
        AND length(btrim("description")) > 0
        AND length(btrim("address")) > 0
        AND length(btrim("city")) > 0
        AND length(btrim("country")) > 0
        AND length(btrim("propertyType")) > 0
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_status_check') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_status_check"
      CHECK ("status" IN ('pending', 'confirmed', 'cancelled', 'completed'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_payment_status_check') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_payment_status_check"
      CHECK ("paymentStatus" IN ('pending', 'submitted', 'paid', 'rejected', 'refunded'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_dates_and_amounts_check') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_dates_and_amounts_check"
      CHECK (
        "checkOut" > "checkIn"
        AND "guests" BETWEEN 1 AND 500
        AND "totalPrice" > 0
        AND "guestId" <> "hostId"
        AND ("bookingPackageUnit" IS NULL OR "bookingPackageUnit" IN ('night', 'day'))
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_no_active_overlap_excl') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_no_active_overlap_excl"
      EXCLUDE USING gist (
        "propertyId" WITH =,
        tsrange("checkIn", "checkOut", '[)') WITH &&
      )
      WHERE ("status" <> 'cancelled')
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_rating_comment_check') THEN
    ALTER TABLE "Review"
      ADD CONSTRAINT "Review_rating_comment_check"
      CHECK ("rating" BETWEEN 1 AND 5 AND length(btrim("comment")) BETWEEN 1 AND 2000)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_participants_body_check') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_participants_body_check"
      CHECK (
        "senderId" <> "receiverId"
        AND length(btrim("message")) BETWEEN 1 AND 2000
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_method_status_check') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_method_status_check"
      CHECK (
        "paymentMethod" IN ('stripe', 'gcash', 'bank_transfer', 'other')
        AND "paymentStatus" IN ('pending', 'submitted', 'paid', 'rejected', 'refunded')
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_amount_reference_check') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_amount_reference_check"
      CHECK ("amount" > 0 AND length(btrim("transactionId")) > 0)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_lifecycle_timestamps_check') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_lifecycle_timestamps_check"
      CHECK (
        ("paymentStatus" <> 'submitted' OR "submittedAt" IS NOT NULL)
        AND ("paymentStatus" <> 'paid' OR "confirmedAt" IS NOT NULL)
        AND ("paymentStatus" <> 'rejected' OR ("rejectedAt" IS NOT NULL AND length(btrim(COALESCE("rejectionReason", ''))) > 0))
        AND ("paymentStatus" <> 'refunded' OR ("confirmedAt" IS NOT NULL OR "submittedAt" IS NOT NULL))
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ListingBookingPackage_business_check') THEN
    ALTER TABLE "ListingBookingPackage"
      ADD CONSTRAINT "ListingBookingPackage_business_check"
      CHECK (
        length(btrim("name")) > 0
        AND length(btrim("accessType")) > 0
        AND "unit" IN ('night', 'day')
        AND "weekdayRate" > 0
        AND "weekendRate" >= 0
        AND ("holidayRate" IS NULL OR "holidayRate" >= 0)
        AND "includedGuests" BETWEEN 1 AND 500
        AND "maxGuests" BETWEEN "includedGuests" AND 500
        AND "additionalGuestFee" >= 0
        AND "extensionHourlyFee" >= 0
        AND length(btrim("checkInTime")) > 0
        AND length(btrim("checkOutTime")) > 0
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformLedgerEntry_business_check') THEN
    ALTER TABLE "PlatformLedgerEntry"
      ADD CONSTRAINT "PlatformLedgerEntry_business_check"
      CHECK (
        "amount" > 0
        AND "source" IN ('manual_payment', 'stripe')
        AND "destination" = 'stayprime_bank'
        AND "status" = 'banked'
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HostExpense_business_check') THEN
    ALTER TABLE "HostExpense"
      ADD CONSTRAINT "HostExpense_business_check"
      CHECK (
        "amount" >= 0
        AND "month" ~ '^[0-9]{4}-[0-9]{2}$'
        AND length(btrim("category")) > 0
        AND length(btrim("vendor")) > 0
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HostMonthlyReport_business_check') THEN
    ALTER TABLE "HostMonthlyReport"
      ADD CONSTRAINT "HostMonthlyReport_business_check"
      CHECK (
        "salesAmount" >= 0
        AND "expensesAmount" >= 0
        AND "month" ~ '^[0-9]{4}-[0-9]{2}$'
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthToken_type_expiry_check') THEN
    ALTER TABLE "AuthToken"
      ADD CONSTRAINT "AuthToken_type_expiry_check"
      CHECK (
        (
          "type" IN ('email_verification', 'password_reset', 'admin_mfa', 'account_deletion')
          OR "type" LIKE 'email_change:%'
        )
        AND "expiresAt" > "createdAt"
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_expiry_check') THEN
    ALTER TABLE "AuthSession"
      ADD CONSTRAINT "AuthSession_expiry_check"
      CHECK ("expiresAt" > "createdAt")
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ListingLocation_coordinates_check') THEN
    ALTER TABLE "ListingLocation"
      ADD CONSTRAINT "ListingLocation_coordinates_check"
      CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ListingPricing_amounts_check') THEN
    ALTER TABLE "ListingPricing"
      ADD CONSTRAINT "ListingPricing_amounts_check"
      CHECK (
        "weekendPrice" > 0
        AND "cleaningFee" >= 0
        AND "securityDeposit" >= 0
        AND length(btrim("currency")) BETWEEN 3 AND 8
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ListingAvailability_nights_check') THEN
    ALTER TABLE "ListingAvailability"
      ADD CONSTRAINT "ListingAvailability_nights_check"
      CHECK ("minNights" >= 1 AND "maxNights" >= "minNights")
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityBlock_reason_nights_check') THEN
    ALTER TABLE "AvailabilityBlock"
      ADD CONSTRAINT "AvailabilityBlock_reason_nights_check"
      CHECK (
        ("reason" IS NULL OR "reason" IN ('booked_elsewhere', 'owner_use', 'maintenance', 'other'))
        AND ("minNights" IS NULL OR "minNights" >= 1)
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cancellation_status_check') THEN
    ALTER TABLE "Cancellation"
      ADD CONSTRAINT "Cancellation_status_check"
      CHECK ("status" IN ('review', 'closed', 'refunded'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payout_business_check') THEN
    ALTER TABLE "Payout"
      ADD CONSTRAINT "Payout_business_check"
      CHECK (
        "amount" > 0
        AND "status" IN ('pending', 'scheduled', 'sent', 'paid', 'released', 'failed', 'cancelled')
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_status_details_check') THEN
    ALTER TABLE "Report"
      ADD CONSTRAINT "Report_status_details_check"
      CHECK (
        "status" IN ('open', 'review', 'closed', 'resolved', 'dismissed', 'rejected', 'pending')
        AND length(btrim("type")) > 0
        AND length(btrim("details")) BETWEEN 1 AND 5000
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminLog_required_text_check') THEN
    ALTER TABLE "AdminLog"
      ADD CONSTRAINT "AdminLog_required_text_check"
      CHECK (
        length(btrim("action")) > 0
        AND length(btrim("entityType")) > 0
        AND length(btrim("entityId")) > 0
      )
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_business_check') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_business_check"
      CHECK (
        "actorRole" IN ('guest', 'host', 'admin', 'super_admin', 'system')
        AND "action" IN ('payment.approved', 'payment.rejected', 'payment.refunded', 'booking.cancelled')
        AND length(btrim("actorId")) > 0
        AND length(btrim("entityType")) > 0
        AND length(btrim("entityId")) > 0
      )
      NOT VALID;
  END IF;
END $$;
