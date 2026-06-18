-- Secure app tables added after the original Supabase RLS baseline.
--
-- Run after the Prisma migrations that create:
-- - public."HostExpense"
-- - public."HostMonthlyReport"
-- - public."AuthSession"
-- - public."ListingBookingPackage"

ALTER TABLE IF EXISTS "HostExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HostExpense" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HostMonthlyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HostMonthlyReport" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuthSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuthSession" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ListingBookingPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ListingBookingPackage" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "HostExpense" FROM anon, authenticated;
REVOKE ALL ON TABLE "HostMonthlyReport" FROM anon, authenticated;
REVOKE ALL ON TABLE "AuthSession" FROM anon, authenticated;
REVOKE ALL ON TABLE "ListingBookingPackage" FROM anon, authenticated;

GRANT SELECT ON TABLE "HostExpense" TO authenticated;
GRANT SELECT ON TABLE "HostMonthlyReport" TO authenticated;
GRANT SELECT ON TABLE "ListingBookingPackage" TO anon, authenticated;

DROP POLICY IF EXISTS host_expense_owner_or_admin_read ON "HostExpense";
CREATE POLICY host_expense_owner_or_admin_read
ON "HostExpense"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("hostId") OR app_security.is_admin());

DROP POLICY IF EXISTS host_monthly_report_owner_or_admin_read ON "HostMonthlyReport";
CREATE POLICY host_monthly_report_owner_or_admin_read
ON "HostMonthlyReport"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("hostId") OR app_security.is_admin());

DROP POLICY IF EXISTS auth_session_no_client_access ON "AuthSession";
CREATE POLICY auth_session_no_client_access
ON "AuthSession"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS listing_booking_package_visible_read ON "ListingBookingPackage";
CREATE POLICY listing_booking_package_visible_read
ON "ListingBookingPackage"
FOR SELECT
TO anon, authenticated
USING (
  app_security.can_read_property("propertyId")
  AND (
    "enabled" = true
    OR app_security.is_property_host("propertyId")
    OR app_security.is_admin()
  )
);
