CREATE TABLE "ListingBookingPackage" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accessType" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "weekdayRate" INTEGER NOT NULL,
  "weekendRate" INTEGER NOT NULL,
  "holidayRate" INTEGER,
  "includedGuests" INTEGER NOT NULL,
  "maxGuests" INTEGER NOT NULL,
  "additionalGuestFee" INTEGER NOT NULL,
  "extensionHourlyFee" INTEGER NOT NULL,
  "checkInTime" TEXT NOT NULL,
  "checkOutTime" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ListingBookingPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ListingBookingPackage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ListingBookingPackage_propertyId_idx" ON "ListingBookingPackage"("propertyId");

ALTER TABLE "Booking"
  ADD COLUMN "bookingPackageId" TEXT,
  ADD COLUMN "bookingPackageName" TEXT,
  ADD COLUMN "bookingPackageUnit" TEXT;
