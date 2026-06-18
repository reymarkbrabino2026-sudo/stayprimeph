DROP INDEX IF EXISTS "HostMonthlyReport_hostId_month_key";

CREATE INDEX IF NOT EXISTS "HostMonthlyReport_hostId_month_idx" ON "HostMonthlyReport"("hostId", "month");
