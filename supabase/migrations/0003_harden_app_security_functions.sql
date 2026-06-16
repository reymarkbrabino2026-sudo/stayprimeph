-- Harden helper function search paths flagged by Supabase Security Advisor.

ALTER FUNCTION app_security.current_user_ids() SET search_path = '';
ALTER FUNCTION app_security.is_current_user(text) SET search_path = '';
