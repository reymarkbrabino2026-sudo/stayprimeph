-- Invalidate any static credentials that may have been created by older seed
-- migrations or bundled demo data before this security hardening pass.
--
-- Accounts with a NULL password cannot sign in through the password flow.
-- Create or rotate the real administrator with an operator-controlled secret
-- after this migration has run.

UPDATE "User"
SET
  "password" = NULL,
  "passwordChangedAt" = CURRENT_TIMESTAMP
WHERE
  "id" IN ('demo-admin', 'demo-guest', 'demo-host')
  OR lower("email") IN (
    'admin@stayprimeph.com',
    'guest@stayprimeph.com',
    'host@stayprimeph.com'
  );
