-- Close RLS gaps for tables added after the initial Supabase security baseline.
--
-- Run after Prisma migrations and supabase/migrations/0001_stayprimeph_rls.sql.

ALTER TABLE IF EXISTS "AccountSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AccountSettings" FORCE ROW LEVEL SECURITY;

-- Prisma owns this migration metadata table. It should not be exposed through
-- Supabase's public API, but forcing RLS here can interfere with migration tools.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AccountSettings" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;

GRANT SELECT ON "AccountSettings" TO authenticated;

DROP POLICY IF EXISTS account_settings_owner_read ON "AccountSettings";
CREATE POLICY account_settings_owner_read
ON "AccountSettings"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("userId") OR app_security.is_admin());
