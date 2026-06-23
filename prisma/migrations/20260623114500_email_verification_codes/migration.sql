ALTER TABLE "AuthToken" DROP CONSTRAINT IF EXISTS "AuthToken_type_expiry_check";

ALTER TABLE "AuthToken"
  ADD CONSTRAINT "AuthToken_type_expiry_check"
  CHECK (
    (
      "type" IN ('email_verification', 'password_reset', 'admin_mfa', 'account_deletion')
      OR "type" LIKE 'email_change:%'
      OR "type" LIKE 'email_verification:%'
    )
    AND "expiresAt" > "createdAt"
  )
  NOT VALID;
