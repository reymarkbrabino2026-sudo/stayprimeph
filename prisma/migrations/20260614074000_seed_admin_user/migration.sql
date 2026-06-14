INSERT INTO "User" (
  "id",
  "name",
  "email",
  "password",
  "role",
  "avatar",
  "phone",
  "emailVerifiedAt",
  "createdAt"
)
VALUES (
  'demo-admin',
  'Demo Admin',
  'admin@stayprimeph.com',
  '$2b$12$tjyvdUNYHDelp9idrg8NruyhJE.57lxzxbGjKW4gm2h86nVFcKNdW',
  'admin',
  'DA',
  '',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "avatar" = EXCLUDED."avatar",
  "phone" = COALESCE("User"."phone", EXCLUDED."phone"),
  "emailVerifiedAt" = COALESCE("User"."emailVerifiedAt", EXCLUDED."emailVerifiedAt");
