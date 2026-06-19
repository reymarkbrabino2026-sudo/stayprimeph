-- Close Supabase Security Advisor warnings for newer database objects.

ALTER FUNCTION public.prevent_immutable_audit_log_mutation()
SET search_path = '';

CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'btree_gist'
      AND extnamespace = 'public'::regnamespace
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END;
$$;
