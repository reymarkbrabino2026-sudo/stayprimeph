-- Pin search paths for booking resource-lock helper functions flagged by
-- Supabase Security Advisor as "Function Search Path Mutable".

ALTER FUNCTION public.stayprimeph_jsonb_text_array(jsonb)
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_all_package_resource_keys(text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_booking_resource_lock_keys(text, text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_refresh_booking_resource_locks(text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_booking_resource_locks_trigger()
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_refresh_property_booking_resource_locks(text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.stayprimeph_listing_booking_package_locks_trigger()
SET search_path = public, pg_temp;
