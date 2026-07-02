ALTER TABLE "HostExpense"
  ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "unit" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HostExpense_quantity_unit_check') THEN
    ALTER TABLE "HostExpense"
      ADD CONSTRAINT "HostExpense_quantity_unit_check"
      CHECK (
        ("quantity" IS NULL OR "quantity" > 0)
        AND ("unit" IS NULL OR length(btrim("unit")) > 0)
      )
      NOT VALID;
  END IF;
END $$;
