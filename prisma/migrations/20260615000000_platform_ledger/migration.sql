CREATE TABLE "PlatformLedgerEntry" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentId" TEXT,
  "amount" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformLedgerEntry_bookingId_key" ON "PlatformLedgerEntry"("bookingId");
CREATE INDEX "PlatformLedgerEntry_status_createdAt_idx" ON "PlatformLedgerEntry"("status", "createdAt");
