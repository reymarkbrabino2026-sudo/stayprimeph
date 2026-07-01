ALTER TABLE "AvailabilityBlock"
  ADD COLUMN IF NOT EXISTS "bookingPackageId" TEXT,
  ADD COLUMN IF NOT EXISTS "bookingPackageName" TEXT;
