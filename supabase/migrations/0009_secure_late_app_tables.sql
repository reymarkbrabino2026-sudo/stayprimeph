-- Secure app tables added after the recent Supabase RLS migrations.
--
-- These tables are exposed in the public schema, so Supabase Security Advisor
-- expects RLS to be enabled even when browser clients should not read them.

ALTER TABLE IF EXISTS "BookingResourceLock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "BookingResourceLock" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ListingRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ListingRoom" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Passkey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Passkey" FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HostCustomerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "HostCustomerProfile" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "BookingResourceLock" FROM anon, authenticated;
REVOKE ALL ON TABLE "ListingRoom" FROM anon, authenticated;
REVOKE ALL ON TABLE "Passkey" FROM anon, authenticated;
REVOKE ALL ON TABLE "HostCustomerProfile" FROM anon, authenticated;

GRANT SELECT ON TABLE "ListingRoom" TO anon, authenticated;
GRANT SELECT ON TABLE "HostCustomerProfile" TO authenticated;

DROP POLICY IF EXISTS booking_resource_lock_no_client_access ON "BookingResourceLock";
CREATE POLICY booking_resource_lock_no_client_access
ON "BookingResourceLock"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS listing_room_visible_read ON "ListingRoom";
CREATE POLICY listing_room_visible_read
ON "ListingRoom"
FOR SELECT
TO anon, authenticated
USING (
  app_security.can_read_property("propertyId")
  AND (
    "active" = true
    OR app_security.is_property_host("propertyId")
    OR app_security.is_admin()
  )
);

DROP POLICY IF EXISTS passkey_no_client_access ON "Passkey";
CREATE POLICY passkey_no_client_access
ON "Passkey"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS host_customer_profile_owner_or_admin_read ON "HostCustomerProfile";
CREATE POLICY host_customer_profile_owner_or_admin_read
ON "HostCustomerProfile"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("hostId") OR app_security.is_admin());
