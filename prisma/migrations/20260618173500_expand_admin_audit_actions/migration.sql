-- Allow persisted audit logs for admin/compliance actions beyond payments.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_business_check') THEN
    ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_business_check";
  END IF;
END $$;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_business_check"
  CHECK (
    "actorRole" IN ('guest', 'host', 'admin', 'super_admin', 'system')
    AND "action" IN (
      'payment.approved',
      'payment.rejected',
      'payment.refunded',
      'booking.cancelled',
      'listing.approved',
      'listing.rejected',
      'account.anonymized',
      'account.email_changed',
      'account.password_reset_requested',
      'account.password_reset_completed',
      'account.role_changed',
      'auth.login_failed',
      'support.replied'
    )
    AND length(btrim("actorId")) > 0
    AND length(btrim("entityType")) > 0
    AND length(btrim("entityId")) > 0
  )
  NOT VALID;
