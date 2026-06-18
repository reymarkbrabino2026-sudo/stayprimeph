ALTER TABLE IF EXISTS "PlatformLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PlatformLedgerEntry" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "PlatformLedgerEntry" FROM anon, authenticated;

GRANT SELECT ON TABLE "PlatformLedgerEntry" TO authenticated;

DROP POLICY IF EXISTS platform_ledger_admin_read ON "PlatformLedgerEntry";
CREATE POLICY platform_ledger_admin_read
ON "PlatformLedgerEntry"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "User"
    WHERE (
      "User"."id" = auth.uid()::text
      OR "User"."id" = 'supabase-' || auth.uid()::text
    )
    AND "User"."role" IN ('admin', 'super_admin')
  )
);
