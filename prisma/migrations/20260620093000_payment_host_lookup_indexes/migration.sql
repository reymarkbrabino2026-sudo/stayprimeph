CREATE INDEX IF NOT EXISTS "Payment_hostId_paymentStatus_createdAt_idx" ON "Payment"("hostId", "paymentStatus", "createdAt");
