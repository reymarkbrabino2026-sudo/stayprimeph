-- Secure append-only compliance audit logs.
--
-- Server-side Prisma/service-role code owns writes to this table. Supabase
-- client roles may only read it when the current user is an admin.

ALTER TABLE IF EXISTS public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AuditLog" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."AuditLog" FROM anon, authenticated;

GRANT SELECT ON TABLE public."AuditLog" TO authenticated;

DROP POLICY IF EXISTS audit_log_admin_read ON public."AuditLog";
CREATE POLICY audit_log_admin_read
ON public."AuditLog"
FOR SELECT
TO authenticated
USING (app_security.is_admin());
