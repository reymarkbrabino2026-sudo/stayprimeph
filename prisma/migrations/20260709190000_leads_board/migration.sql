CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "companyOrGroup" TEXT,
  "source" TEXT,
  "preferredPropertyId" TEXT,
  "checkIn" TIMESTAMP(3),
  "checkOut" TIMESTAMP(3),
  "guests" INTEGER,
  "estimatedValue" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'new',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "notes" TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lead_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Lead_preferredPropertyId_fkey" FOREIGN KEY ("preferredPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Lead_hostId_status_displayOrder_idx" ON "Lead"("hostId", "status", "displayOrder");
CREATE INDEX "Lead_hostId_archivedAt_idx" ON "Lead"("hostId", "archivedAt");
CREATE INDEX "Lead_preferredPropertyId_idx" ON "Lead"("preferredPropertyId");
