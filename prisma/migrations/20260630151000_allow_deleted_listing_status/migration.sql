-- Soft-deleted listings keep historical booking/payment relations intact.
-- The app hides status='deleted' listings from host/public listing surfaces.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Property_status_check') THEN
    ALTER TABLE "Property" DROP CONSTRAINT "Property_status_check";
  END IF;
END $$;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_status_check"
  CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected', 'deleted'))
  NOT VALID;
