CREATE TABLE IF NOT EXISTS "HostCustomerProfile" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "classification" TEXT NOT NULL DEFAULT 'ordinary',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostCustomerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HostCustomerProfile_hostId_guestId_key"
  ON "HostCustomerProfile"("hostId", "guestId");

CREATE INDEX IF NOT EXISTS "HostCustomerProfile_hostId_idx"
  ON "HostCustomerProfile"("hostId");

CREATE INDEX IF NOT EXISTS "HostCustomerProfile_guestId_idx"
  ON "HostCustomerProfile"("guestId");
