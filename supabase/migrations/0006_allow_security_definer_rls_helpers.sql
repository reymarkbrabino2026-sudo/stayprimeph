-- Allow SECURITY DEFINER helper functions to read their lookup tables.
--
-- Client roles still go through the table RLS policies because they are not the
-- table owner. Removing FORCE avoids recursive/blocked checks inside helpers
-- such as app_security.is_admin(), app_security.can_read_property(), and
-- app_security.can_read_booking().

ALTER TABLE IF EXISTS "User" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Property" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Booking" NO FORCE ROW LEVEL SECURITY;
