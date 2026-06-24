CREATE TABLE "ListingRoom" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "floor" TEXT NOT NULL,
  "description" TEXT,
  "photoUrls" JSONB,
  "amenities" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ListingRoom_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ListingRoom_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ListingRoom_propertyId_idx" ON "ListingRoom"("propertyId");

ALTER TABLE "ListingBookingPackage"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sleepingCapacity" INTEGER,
  ADD COLUMN "durationHours" INTEGER,
  ADD COLUMN "accessibleFloors" JSONB,
  ADD COLUMN "accessibleRoomIds" JSONB,
  ADD COLUMN "includedAmenities" JSONB,
  ADD COLUMN "excludedAmenities" JSONB,
  ADD COLUMN "availableDays" JSONB,
  ADD COLUMN "minimumAdvanceBookingDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blockedPackageIds" JSONB;
