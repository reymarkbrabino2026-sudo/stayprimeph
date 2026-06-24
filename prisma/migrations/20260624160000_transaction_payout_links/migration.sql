ALTER TABLE "Payout" ADD COLUMN "bookingId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "paymentId" TEXT;

CREATE UNIQUE INDEX "Payout_bookingId_key" ON "Payout"("bookingId");
CREATE INDEX "Payout_paymentId_idx" ON "Payout"("paymentId");
