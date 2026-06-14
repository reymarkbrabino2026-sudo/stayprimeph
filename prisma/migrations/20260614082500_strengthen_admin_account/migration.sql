UPDATE "User"
SET
  "name" = 'StayPrimePH Admin',
  "password" = '$2b$12$LU1BEyyeDRv2lwbrgovjaeqM53kxcSTpOPxnUNFixadXagaWQZMWe',
  "role" = 'admin',
  "avatar" = 'SA',
  "emailVerifiedAt" = COALESCE("emailVerifiedAt", CURRENT_TIMESTAMP)
WHERE "email" = 'admin@stayprimeph.com';
