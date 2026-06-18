ALTER TABLE "HostMonthlyReport"
ADD COLUMN IF NOT EXISTS "reportDate" TIMESTAMP(3);

UPDATE "HostMonthlyReport"
SET "reportDate" = TO_DATE("month" || '-01', 'YYYY-MM-DD')
WHERE "reportDate" IS NULL;
