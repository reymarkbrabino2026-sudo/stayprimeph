ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3);
ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "mfaRole" TEXT;

CREATE INDEX IF NOT EXISTS "AuthSession_userId_createdAt_idx" ON "AuthSession"("userId", "createdAt");
