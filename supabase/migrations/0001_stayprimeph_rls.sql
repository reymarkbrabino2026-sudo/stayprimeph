-- StayPrimePH Supabase Row Level Security baseline.
--
-- Apply this after the Prisma schema migrations have created the public tables.
-- This migration is Supabase-specific because it uses auth.uid(), anon, and authenticated.

CREATE SCHEMA IF NOT EXISTS app_security;

CREATE OR REPLACE FUNCTION app_security.current_user_ids()
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT array_remove(ARRAY[
    auth.uid()::text,
    CASE
      WHEN auth.uid() IS NULL THEN NULL
      ELSE 'supabase-' || auth.uid()::text
    END
  ], NULL);
$$;

CREATE OR REPLACE FUNCTION app_security.is_current_user(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT user_id = ANY(app_security.current_user_ids());
$$;

CREATE OR REPLACE FUNCTION app_security.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_security
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."User"
    WHERE "id" = ANY(app_security.current_user_ids())
      AND "role" IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION app_security.can_read_property(property_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_security
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Property"
    WHERE "id" = property_id
      AND (
        "status" = 'approved'
        OR app_security.is_current_user("hostId")
        OR app_security.is_admin()
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_security.is_property_host(property_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_security
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Property"
    WHERE "id" = property_id
      AND app_security.is_current_user("hostId")
  );
$$;

CREATE OR REPLACE FUNCTION app_security.can_read_booking(booking_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_security
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Booking"
    WHERE "id" = booking_id
      AND (
        app_security.is_current_user("guestId")
        OR app_security.is_current_user("hostId")
        OR app_security.is_admin()
      )
  );
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_security TO anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Amenity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyAmenity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingPricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvailabilityBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingHighlight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cancellation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminLog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Property" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PropertyImage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Amenity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PropertyAmenity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Booking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Review" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuthToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "HostProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ListingLocation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ListingPricing" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ListingAvailability" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AvailabilityBlock" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ListingHighlight" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Cancellation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payout" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Report" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AdminLog" FORCE ROW LEVEL SECURITY;

GRANT SELECT ON
  "Property",
  "PropertyImage",
  "Amenity",
  "PropertyAmenity",
  "Review",
  "ListingLocation",
  "ListingPricing",
  "ListingAvailability",
  "AvailabilityBlock",
  "ListingHighlight"
TO anon, authenticated;

GRANT SELECT ON
  "User",
  "Booking",
  "Message",
  "Wishlist",
  "Payment",
  "HostProfile",
  "Cancellation",
  "Payout",
  "Report",
  "AdminLog"
TO authenticated;

GRANT INSERT ON
  "Review",
  "Message",
  "Wishlist",
  "Report"
TO authenticated;

GRANT UPDATE ON
  "Report"
TO authenticated;

GRANT DELETE ON
  "Wishlist"
TO authenticated;

DROP POLICY IF EXISTS user_read_own_or_admin ON "User";
CREATE POLICY user_read_own_or_admin
ON "User"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("id") OR app_security.is_admin());

DROP POLICY IF EXISTS property_public_or_owner_read ON "Property";
CREATE POLICY property_public_or_owner_read
ON "Property"
FOR SELECT
TO anon, authenticated
USING (
  "status" = 'approved'
  OR app_security.is_current_user("hostId")
  OR app_security.is_admin()
);

DROP POLICY IF EXISTS property_image_visible_read ON "PropertyImage";
CREATE POLICY property_image_visible_read
ON "PropertyImage"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS amenity_public_read ON "Amenity";
CREATE POLICY amenity_public_read
ON "Amenity"
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS property_amenity_visible_read ON "PropertyAmenity";
CREATE POLICY property_amenity_visible_read
ON "PropertyAmenity"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS booking_read_participant_or_admin ON "Booking";
CREATE POLICY booking_read_participant_or_admin
ON "Booking"
FOR SELECT
TO authenticated
USING (
  app_security.is_current_user("guestId")
  OR app_security.is_current_user("hostId")
  OR app_security.is_admin()
);

DROP POLICY IF EXISTS review_public_approved_read ON "Review";
CREATE POLICY review_public_approved_read
ON "Review"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS review_guest_insert_after_booking ON "Review";
CREATE POLICY review_guest_insert_after_booking
ON "Review"
FOR INSERT
TO authenticated
WITH CHECK (
  app_security.is_current_user("guestId")
  AND "rating" BETWEEN 1 AND 5
  AND length("comment") BETWEEN 1 AND 2000
  AND EXISTS (
    SELECT 1
    FROM "Booking"
    WHERE "Booking"."propertyId" = "Review"."propertyId"
      AND "Booking"."guestId" = "Review"."guestId"
      AND "Booking"."paymentStatus" = 'paid'
      AND (
        "Booking"."status" = 'completed'
        OR (
          "Booking"."status" = 'confirmed'
          AND "Booking"."checkOut" <= now()
        )
      )
  )
);

DROP POLICY IF EXISTS message_read_participant_or_admin ON "Message";
CREATE POLICY message_read_participant_or_admin
ON "Message"
FOR SELECT
TO authenticated
USING (
  app_security.is_current_user("senderId")
  OR app_security.is_current_user("receiverId")
  OR app_security.is_admin()
);

DROP POLICY IF EXISTS message_sender_insert ON "Message";
CREATE POLICY message_sender_insert
ON "Message"
FOR INSERT
TO authenticated
WITH CHECK (
  app_security.is_current_user("senderId")
  AND "receiverId" <> "senderId"
  AND length("message") BETWEEN 1 AND 2000
  AND (
    "bookingId" IS NOT NULL
    OR "propertyId" IS NOT NULL
  )
  AND (
    "bookingId" IS NULL
    OR EXISTS (
      SELECT 1
      FROM "Booking"
      WHERE "Booking"."id" = "Message"."bookingId"
        AND (
          (
            "Message"."senderId" = "Booking"."guestId"
            AND "Message"."receiverId" = "Booking"."hostId"
          )
          OR (
            "Message"."senderId" = "Booking"."hostId"
            AND "Message"."receiverId" = "Booking"."guestId"
          )
          OR app_security.is_admin()
        )
    )
  )
  AND (
    "propertyId" IS NULL
    OR EXISTS (
      SELECT 1
      FROM "Property"
      WHERE "Property"."id" = "Message"."propertyId"
        AND "Property"."status" = 'approved'
        AND (
          "Message"."senderId" = "Property"."hostId"
          OR "Message"."receiverId" = "Property"."hostId"
          OR app_security.is_admin()
        )
    )
  )
);

DROP POLICY IF EXISTS wishlist_owner_read ON "Wishlist";
CREATE POLICY wishlist_owner_read
ON "Wishlist"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("userId") OR app_security.is_admin());

DROP POLICY IF EXISTS wishlist_owner_insert ON "Wishlist";
CREATE POLICY wishlist_owner_insert
ON "Wishlist"
FOR INSERT
TO authenticated
WITH CHECK (
  app_security.is_current_user("userId")
  AND app_security.can_read_property("propertyId")
);

DROP POLICY IF EXISTS wishlist_owner_delete ON "Wishlist";
CREATE POLICY wishlist_owner_delete
ON "Wishlist"
FOR DELETE
TO authenticated
USING (app_security.is_current_user("userId") OR app_security.is_admin());

DROP POLICY IF EXISTS payment_read_participant_or_admin ON "Payment";
CREATE POLICY payment_read_participant_or_admin
ON "Payment"
FOR SELECT
TO authenticated
USING (
  app_security.is_admin()
  OR (
    "guestId" IS NOT NULL
    AND app_security.is_current_user("guestId")
  )
  OR (
    "hostId" IS NOT NULL
    AND app_security.is_current_user("hostId")
  )
  OR app_security.can_read_booking("bookingId")
);

DROP POLICY IF EXISTS auth_token_no_client_access ON "AuthToken";
CREATE POLICY auth_token_no_client_access
ON "AuthToken"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS host_profile_read_owner_or_admin ON "HostProfile";
CREATE POLICY host_profile_read_owner_or_admin
ON "HostProfile"
FOR SELECT
TO authenticated
USING (
  app_security.is_current_user("userId")
  OR app_security.is_admin()
  OR EXISTS (
    SELECT 1
    FROM "Property"
    WHERE "Property"."hostId" = "HostProfile"."userId"
      AND "Property"."status" = 'approved'
  )
);

DROP POLICY IF EXISTS listing_location_visible_read ON "ListingLocation";
CREATE POLICY listing_location_visible_read
ON "ListingLocation"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS listing_pricing_visible_read ON "ListingPricing";
CREATE POLICY listing_pricing_visible_read
ON "ListingPricing"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS listing_availability_visible_read ON "ListingAvailability";
CREATE POLICY listing_availability_visible_read
ON "ListingAvailability"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS availability_block_visible_read ON "AvailabilityBlock";
CREATE POLICY availability_block_visible_read
ON "AvailabilityBlock"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS listing_highlight_visible_read ON "ListingHighlight";
CREATE POLICY listing_highlight_visible_read
ON "ListingHighlight"
FOR SELECT
TO anon, authenticated
USING (app_security.can_read_property("propertyId"));

DROP POLICY IF EXISTS cancellation_read_participant_or_admin ON "Cancellation";
CREATE POLICY cancellation_read_participant_or_admin
ON "Cancellation"
FOR SELECT
TO authenticated
USING (
  app_security.can_read_booking("bookingId")
  OR app_security.is_property_host("propertyId")
  OR app_security.is_admin()
);

DROP POLICY IF EXISTS payout_read_host_or_admin ON "Payout";
CREATE POLICY payout_read_host_or_admin
ON "Payout"
FOR SELECT
TO authenticated
USING (app_security.is_current_user("hostId") OR app_security.is_admin());

DROP POLICY IF EXISTS report_read_owner_or_admin ON "Report";
CREATE POLICY report_read_owner_or_admin
ON "Report"
FOR SELECT
TO authenticated
USING (
  app_security.is_admin()
  OR (
    "reporterId" IS NOT NULL
    AND app_security.is_current_user("reporterId")
  )
);

DROP POLICY IF EXISTS report_user_insert ON "Report";
CREATE POLICY report_user_insert
ON "Report"
FOR INSERT
TO authenticated
WITH CHECK (
  app_security.is_current_user("reporterId")
  AND length("details") BETWEEN 1 AND 5000
);

DROP POLICY IF EXISTS report_admin_update ON "Report";
CREATE POLICY report_admin_update
ON "Report"
FOR UPDATE
TO authenticated
USING (app_security.is_admin())
WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS admin_log_admin_read ON "AdminLog";
CREATE POLICY admin_log_admin_read
ON "AdminLog"
FOR SELECT
TO authenticated
USING (app_security.is_admin());
