-- Replace the broad per-property booking overlap exclusion with package-aware
-- resource locks. Each booking gets deterministic lock rows derived from its
-- package and the listing's package conflict graph. PostgreSQL then enforces
-- "no active overlapping lock on the same property/resource" with GiST.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS "BookingResourceLock" (
  "bookingId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "resourceKey" TEXT NOT NULL,
  "checkIn" TIMESTAMP(3) NOT NULL,
  "checkOut" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingResourceLock_pkey" PRIMARY KEY ("bookingId", "resourceKey"),
  CONSTRAINT "BookingResourceLock_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookingResourceLock_propertyId_resourceKey_checkIn_checkOut_idx"
  ON "BookingResourceLock"("propertyId", "resourceKey", "checkIn", "checkOut");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingResourceLock_dates_check') THEN
    ALTER TABLE "BookingResourceLock"
      ADD CONSTRAINT "BookingResourceLock_dates_check"
      CHECK ("checkOut" > "checkIn")
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingResourceLock_no_active_overlap_excl') THEN
    ALTER TABLE "BookingResourceLock"
      ADD CONSTRAINT "BookingResourceLock_no_active_overlap_excl"
      EXCLUDE USING gist (
        "propertyId" WITH =,
        "resourceKey" WITH =,
        tsrange("checkIn", "checkOut", '[)') WITH &&
      )
      WHERE ("status" <> 'cancelled')
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION stayprimeph_jsonb_text_array(value jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(items."value"), ARRAY[]::text[])
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(value) = 'array' THEN value ELSE '[]'::jsonb END
  ) AS items("value")
$$;

CREATE OR REPLACE FUNCTION stayprimeph_all_package_resource_keys(p_property_id text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    array_agg('pkg:' || "id" ORDER BY "id"),
    ARRAY['property:' || p_property_id]
  )
  FROM "ListingBookingPackage"
  WHERE "propertyId" = p_property_id
    AND "enabled" = true
    AND COALESCE("status", 'active') <> 'inactive'
$$;

CREATE OR REPLACE FUNCTION stayprimeph_booking_resource_lock_keys(p_property_id text, p_booking_package_id text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  package_exists boolean;
  keys text[];
BEGIN
  IF p_booking_package_id IS NULL OR btrim(p_booking_package_id) = '' THEN
    RETURN stayprimeph_all_package_resource_keys(p_property_id);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "ListingBookingPackage"
    WHERE "propertyId" = p_property_id
      AND "id" = p_booking_package_id
      AND "enabled" = true
      AND COALESCE("status", 'active') <> 'inactive'
  )
  INTO package_exists;

  IF NOT package_exists THEN
    RETURN stayprimeph_all_package_resource_keys(p_property_id);
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT locks."key"
    FROM (
      SELECT 'pkg:' || requested."id" AS "key"
      FROM "ListingBookingPackage" requested
      WHERE requested."propertyId" = p_property_id
        AND requested."id" = p_booking_package_id
        AND requested."enabled" = true
        AND COALESCE(requested."status", 'active') <> 'inactive'

      UNION ALL

      SELECT 'pair:' || LEAST(requested."id", other."id") || ':' || GREATEST(requested."id", other."id") AS "key"
      FROM "ListingBookingPackage" requested
      JOIN "ListingBookingPackage" other
        ON other."propertyId" = requested."propertyId"
       AND other."id" <> requested."id"
       AND other."enabled" = true
       AND COALESCE(other."status", 'active') <> 'inactive'
      WHERE requested."propertyId" = p_property_id
        AND requested."id" = p_booking_package_id
        AND requested."enabled" = true
        AND COALESCE(requested."status", 'active') <> 'inactive'
        AND (
          other."id" = ANY(stayprimeph_jsonb_text_array(requested."blockedPackageIds"))
          OR requested."id" = ANY(stayprimeph_jsonb_text_array(other."blockedPackageIds"))
        )
    ) locks
    ORDER BY locks."key"
  )
  INTO keys;

  IF array_length(keys, 1) IS NULL THEN
    RETURN stayprimeph_all_package_resource_keys(p_property_id);
  END IF;

  RETURN keys;
END $$;

CREATE OR REPLACE FUNCTION stayprimeph_refresh_booking_resource_locks(p_booking_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  booking_row RECORD;
  lock_key text;
BEGIN
  SELECT "id", "propertyId", "bookingPackageId", "checkIn", "checkOut", "status"
  INTO booking_row
  FROM "Booking"
  WHERE "id" = p_booking_id;

  IF NOT FOUND THEN
    DELETE FROM "BookingResourceLock" WHERE "bookingId" = p_booking_id;
    RETURN;
  END IF;

  DELETE FROM "BookingResourceLock" WHERE "bookingId" = booking_row."id";

  FOREACH lock_key IN ARRAY stayprimeph_booking_resource_lock_keys(booking_row."propertyId", booking_row."bookingPackageId")
  LOOP
    INSERT INTO "BookingResourceLock" (
      "bookingId", "propertyId", "resourceKey", "checkIn", "checkOut", "status"
    )
    VALUES (
      booking_row."id", booking_row."propertyId", lock_key, booking_row."checkIn", booking_row."checkOut", booking_row."status"
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION stayprimeph_booking_resource_locks_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM stayprimeph_refresh_booking_resource_locks(NEW."id");
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "Booking_refresh_resource_locks" ON "Booking";
CREATE TRIGGER "Booking_refresh_resource_locks"
  AFTER INSERT OR UPDATE OF "propertyId", "bookingPackageId", "checkIn", "checkOut", "status"
  ON "Booking"
  FOR EACH ROW
  EXECUTE FUNCTION stayprimeph_booking_resource_locks_trigger();

CREATE OR REPLACE FUNCTION stayprimeph_refresh_property_booking_resource_locks(p_property_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  booking_id text;
BEGIN
  FOR booking_id IN
    SELECT "id" FROM "Booking" WHERE "propertyId" = p_property_id
  LOOP
    PERFORM stayprimeph_refresh_booking_resource_locks(booking_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION stayprimeph_listing_booking_package_locks_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM stayprimeph_refresh_property_booking_resource_locks(OLD."propertyId");
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."propertyId" IS DISTINCT FROM NEW."propertyId" THEN
    PERFORM stayprimeph_refresh_property_booking_resource_locks(OLD."propertyId");
    PERFORM stayprimeph_refresh_property_booking_resource_locks(NEW."propertyId");
    RETURN NEW;
  END IF;

  PERFORM stayprimeph_refresh_property_booking_resource_locks(NEW."propertyId");
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "ListingBookingPackage_refresh_booking_resource_locks" ON "ListingBookingPackage";
CREATE TRIGGER "ListingBookingPackage_refresh_booking_resource_locks"
  AFTER INSERT OR DELETE OR UPDATE OF "propertyId", "id", "status", "enabled", "blockedPackageIds"
  ON "ListingBookingPackage"
  FOR EACH ROW
  EXECUTE FUNCTION stayprimeph_listing_booking_package_locks_trigger();

DO $$
DECLARE
  booking_id text;
BEGIN
  DELETE FROM "BookingResourceLock";
  FOR booking_id IN
    SELECT "id" FROM "Booking"
  LOOP
    PERFORM stayprimeph_refresh_booking_resource_locks(booking_id);
  END LOOP;
END $$;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_no_active_overlap_excl";
