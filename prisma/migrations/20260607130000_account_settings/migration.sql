CREATE TABLE "AccountSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "personalInfo" JSONB NOT NULL,
  "notificationPreferences" JSONB NOT NULL,
  "privacy" JSONB NOT NULL,
  "bookingPermissions" JSONB NOT NULL,
  "workTravel" JSONB NOT NULL,
  "professionalHostingTools" JSONB NOT NULL,
  "financial" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountSettings_userId_key" ON "AccountSettings"("userId");

ALTER TABLE "AccountSettings"
  ADD CONSTRAINT "AccountSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
