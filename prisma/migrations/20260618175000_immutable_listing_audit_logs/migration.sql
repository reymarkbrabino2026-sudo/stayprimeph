-- Make compliance-critical audit records append-only.
-- These rows are evidence for admin listing review, payment decisions, refunds,
-- and verified account deletion/anonymization, and must not be modified or
-- deleted after insertion.

CREATE OR REPLACE FUNCTION prevent_immutable_audit_log_mutation()
RETURNS trigger AS $$
DECLARE
  immutable_actions CONSTANT text[] := ARRAY[
    'listing.approved',
    'listing.rejected',
    'payment.approved',
    'payment.rejected',
    'payment.refunded',
    'account.anonymized'
  ];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."action" = ANY (immutable_actions)
       OR NEW."action" = ANY (immutable_actions) THEN
      RAISE EXCEPTION 'Compliance-critical audit logs are immutable';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD."action" = ANY (immutable_actions) THEN
      RAISE EXCEPTION 'Compliance-critical audit logs are immutable';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditLog_listing_review_immutable" ON "AuditLog";
DROP TRIGGER IF EXISTS "AuditLog_immutable_actions" ON "AuditLog";

CREATE TRIGGER "AuditLog_immutable_actions"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_immutable_audit_log_mutation();
