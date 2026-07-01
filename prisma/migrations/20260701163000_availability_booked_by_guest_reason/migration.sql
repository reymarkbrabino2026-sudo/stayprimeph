DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityBlock_reason_nights_check') THEN
    ALTER TABLE "AvailabilityBlock" DROP CONSTRAINT "AvailabilityBlock_reason_nights_check";
  END IF;

  ALTER TABLE "AvailabilityBlock"
    ADD CONSTRAINT "AvailabilityBlock_reason_nights_check"
    CHECK (
      ("reason" IS NULL OR "reason" IN ('booked_elsewhere', 'booked_by_guest', 'owner_use', 'maintenance', 'other'))
      AND ("minNights" IS NULL OR "minNights" >= 1)
    )
    NOT VALID;
END $$;
