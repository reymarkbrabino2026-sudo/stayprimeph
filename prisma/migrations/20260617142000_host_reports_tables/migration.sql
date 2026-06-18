CREATE TABLE IF NOT EXISTS "HostExpense" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "month" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "vendor" TEXT NOT NULL,
  "description" TEXT,
  "receiptReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HostExpense_hostId_month_idx" ON "HostExpense"("hostId", "month");
CREATE INDEX IF NOT EXISTS "HostExpense_month_expenseDate_idx" ON "HostExpense"("month", "expenseDate");

CREATE TABLE IF NOT EXISTS "HostMonthlyReport" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "salesAmount" DOUBLE PRECISION NOT NULL,
  "expensesAmount" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostMonthlyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HostMonthlyReport_hostId_month_key" ON "HostMonthlyReport"("hostId", "month");
CREATE INDEX IF NOT EXISTS "HostMonthlyReport_month_idx" ON "HostMonthlyReport"("month");
