import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

async function readRepoFile(file: string) {
  return fs.readFile(path.join(repoRoot, file), "utf8");
}

describe("infrastructure security controls", () => {
  test("runs security checks in GitHub Actions", async () => {
    const workflow = await readRepoFile(".github/workflows/security-ci.yml");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm run type-check");
    expect(workflow).toContain("npm run test:unit");
    expect(workflow).toContain("npx prisma validate");
    expect(workflow).toContain("npm run prod:check");
    expect(workflow).toContain("actions/dependency-review-action@v4");
    expect(workflow).toContain("fail-on-severity: high");
    expect(workflow).toContain("trufflesecurity/trufflehog@main");
    expect(workflow).toContain("--results=verified,unknown");
    expect(workflow).toContain("npm audit --audit-level=high");
    expect(workflow).toContain("npm audit --omit=dev");
    expect(workflow).toContain("Reject committed local secret files");
  });

  test("documents GitHub and provider secret scanning controls", async () => {
    const docs = await readRepoFile("docs/secret-scanning.md");

    expect(docs).toContain("Secret scanning: enabled.");
    expect(docs).toContain("Push protection: enabled.");
    expect(docs).toContain("Dependabot alerts: enabled.");
    expect(docs).toContain("Dependabot security updates: enabled.");
    expect(docs).toContain("TruffleHog secret scanning.");
    expect(docs).toContain("Store production secrets only in Vercel/provider secret managers.");
  });

  test("keeps static and dynamic security headers aligned", async () => {
    const [nextConfig, proxy] = await Promise.all([
      readRepoFile("next.config.ts"),
      readRepoFile("proxy.ts"),
    ]);
    const requiredHeaders = [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy",
    ];

    for (const header of requiredHeaders) {
      if (header === "Content-Security-Policy") {
        expect(proxy).toContain(header);
        expect(nextConfig).not.toContain(`{ key: "${header}"`);
      } else {
        expect(nextConfig).toContain(header);
        expect(proxy).toContain(header);
      }
    }
  });

  test("uses sanitized build-time placeholders instead of production secrets", async () => {
    const [vercelBuild, dockerfile] = await Promise.all([
      readRepoFile("scripts/vercel-build.mjs"),
      readRepoFile("Dockerfile"),
    ]);

    expect(vercelBuild).toContain("STAYPRIMEPH_BUILD_PHASE");
    expect(vercelBuild).toContain("build-time-placeholder-with-32-plus-characters");
    expect(vercelBuild).toContain('PERSISTENCE_DRIVER: "json"');
    expect(vercelBuild).not.toContain("sk_live_");
    expect(vercelBuild).not.toContain("pk_live_");
    expect(dockerfile).toContain("STAYPRIMEPH_BUILD_PHASE=1");
    expect(dockerfile).toContain("build-time-placeholder-with-32-plus-characters");
    expect(dockerfile).not.toContain("ARG DATABASE_URL");
    expect(dockerfile).not.toContain("ARG AUTH_SECRET");
    expect(dockerfile).not.toContain("sk_live_");
  });

  test("enables RLS on late app tables flagged by Supabase Security Advisor", async () => {
    const [migration, docs] = await Promise.all([
      readRepoFile("supabase/migrations/0009_secure_late_app_tables.sql"),
      readRepoFile("docs/supabase-security.md"),
    ]);
    const tables = ["BookingResourceLock", "ListingRoom", "Passkey", "HostCustomerProfile"];

    for (const table of tables) {
      expect(migration).toContain(`ALTER TABLE IF EXISTS "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE IF EXISTS "${table}" FORCE ROW LEVEL SECURITY`);
      expect(docs).toContain("supabase/migrations/0009_secure_late_app_tables.sql");
    }

    expect(migration).toContain("booking_resource_lock_no_client_access");
    expect(migration).toContain("listing_room_visible_read");
    expect(migration).toContain("passkey_no_client_access");
    expect(migration).toContain("host_customer_profile_owner_or_admin_read");
  });

  test("pins search paths for booking resource lock functions flagged by Supabase Security Advisor", async () => {
    const [migration, docs] = await Promise.all([
      readRepoFile("supabase/migrations/0010_harden_booking_resource_lock_function_search_paths.sql"),
      readRepoFile("docs/supabase-security.md"),
    ]);
    const functionSignatures = [
      "stayprimeph_jsonb_text_array(jsonb)",
      "stayprimeph_all_package_resource_keys(text)",
      "stayprimeph_booking_resource_lock_keys(text, text)",
      "stayprimeph_refresh_booking_resource_locks(text)",
      "stayprimeph_booking_resource_locks_trigger()",
      "stayprimeph_refresh_property_booking_resource_locks(text)",
      "stayprimeph_listing_booking_package_locks_trigger()",
    ];

    for (const signature of functionSignatures) {
      expect(migration).toContain(`ALTER FUNCTION public.${signature}`);
      expect(migration).toContain("SET search_path = public, pg_temp;");
    }

    expect(docs).toContain("supabase/migrations/0010_harden_booking_resource_lock_function_search_paths.sql");
    expect(docs).toContain("Leaked password protection");
    expect(docs).toContain("Pro plan or above");
  });

  test("self-heals additive listing schema before raw ERP queries", async () => {
    const repositories = await readRepoFile("lib/repositories.ts");

    expect(repositories).toMatch(/export async function listPropertiesFromDatabase\(\): Promise<Property\[]> {[\s\S]*?await ensurePropertyAdvancedPricingColumns\(\);[\s\S]*?await ensureListingBookingPackageTable\(\);[\s\S]*?await ensureListingRoomTable\(\);/);
    expect(repositories).toMatch(/export async function findPropertyByIdFromDatabase\(id: string\): Promise<Property \| null> {[\s\S]*?await ensurePropertyAdvancedPricingColumns\(\);[\s\S]*?await ensureListingBookingPackageTable\(\);[\s\S]*?await ensureListingRoomTable\(\);/);
    expect(repositories).toMatch(/export async function listBookingsFromDatabase\(\): Promise<Booking\[]> {\s+await ensureBookingPackageColumns\(\);/);
    expect(repositories).toMatch(/export async function listPaymentsFromDatabase\(\): Promise<Payment\[]> {\s+await ensurePaymentColumns\(\);/);
    expect(repositories).toMatch(/ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptImageUrl" TEXT/);
    expect(repositories).toMatch(/ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP\(3\) NOT NULL DEFAULT CURRENT_TIMESTAMP/);
  });

  test("keeps booking overlap prevention at the database layer", async () => {
    const [migration, schema, repositories] = await Promise.all([
      readRepoFile("prisma/migrations/20260623164000_booking_resource_locks/migration.sql"),
      readRepoFile("prisma/schema.prisma"),
      readRepoFile("lib/repositories.ts"),
    ]);

    expect(schema).toContain("model BookingResourceLock");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "BookingResourceLock"');
    expect(migration).toContain('CONSTRAINT "BookingResourceLock_no_active_overlap_excl"');
    expect(migration).toContain("EXCLUDE USING gist");
    expect(migration).toContain('tsrange("checkIn", "checkOut", \'[)\') WITH &&');
    expect(migration).toContain('CREATE TRIGGER "Booking_refresh_resource_locks"');
    expect(migration).toContain('CREATE TRIGGER "ListingBookingPackage_refresh_booking_resource_locks"');
    expect(migration).toContain('ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_no_active_overlap_excl"');
    expect(repositories).toContain("bookingPackageId: booking.bookingPackageId ?? null");
    expect(repositories).not.toContain('UPDATE "Booking"');
  });

  test("wires persistent AdminLog records across sensitive admin actions", async () => {
    const [adminLogs, listings, payments, bookings, accountDeletion, checklist] = await Promise.all([
      readRepoFile("lib/admin-logs.ts"),
      readRepoFile("app/admin/listings/actions.ts"),
      readRepoFile("app/admin/payments/actions.ts"),
      readRepoFile("app/admin/bookings/actions.ts"),
      readRepoFile("lib/account-deletion.ts"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(adminLogs).toContain("appendAdminLogInDatabase");
    expect(adminLogs).toContain('const storeFileName = "admin-logs.json"');
    expect(listings).toContain("appendAdminLog");
    expect(listings).toContain("listing.approved");
    expect(listings).toContain("listing.rejected");
    expect(payments).toContain("appendAdminLog");
    expect(payments).toContain("payment.approved");
    expect(payments).toContain("payment.rejected");
    expect(payments).toContain("settings.payout_recorded");
    expect(bookings).toContain("appendAdminLog");
    expect(bookings).toContain("dispute.refund_approved");
    expect(bookings).toContain("dispute.closed_without_refund");
    expect(accountDeletion).toContain("appendAdminLog");
    expect(accountDeletion).toContain("account.anonymized");
    expect(checklist).toContain("[x] Wire persistent `AdminLog` records");
  });

  test("guards custom non-webhook state-changing API POST routes with shared CSRF and origin checks", async () => {
    const apiRoutes = [
      "app/api/payments/checkout/route.ts",
      "app/api/uploads/avatar/route.ts",
      "app/api/uploads/listing-photo/route.ts",
      "app/api/uploads/listing-photo/blob/route.ts",
    ];
    const routeTexts = await Promise.all(apiRoutes.map(readRepoFile));
    const webhook = await readRepoFile("app/api/payments/webhook/route.ts");

    for (const route of routeTexts) {
      expect(route).toContain("requireStateChangingApiRequest");
      expect(route).toContain("if (!guard.ok) return guard.response");
    }
    expect(webhook).not.toContain("requireStateChangingApiRequest");
    expect(webhook).toContain("stripe.webhooks.constructEvent");
  });

  test("hardens customer upload handling before storage", async () => {
    const [validation, photoStorage, listingUpload, avatarUpload, receiptStorage, bookingActions, checklist] = await Promise.all([
      readRepoFile("lib/listing-photo-upload-validation.ts"),
      readRepoFile("lib/photo-storage.ts"),
      readRepoFile("app/api/uploads/listing-photo/route.ts"),
      readRepoFile("app/api/uploads/avatar/route.ts"),
      readRepoFile("lib/payment-receipt-storage.ts"),
      readRepoFile("app/guest/bookings/actions.ts"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(validation).toContain("sniffListingPhotoMime");
    expect(validation).toContain("scanListingPhotoForMalware");
    expect(validation).toContain("moderateListingPhotoImage");
    expect(validation).toContain("bytes.length > maxListingPhotoUploadBytes");
    expect(photoStorage).toContain("cleanupUploadedPhotos");
    expect(photoStorage).toContain("cleanupStoredPhotoUrl");
    for (const uploadPath of [listingUpload, avatarUpload, receiptStorage]) {
      expect(uploadPath).toContain("scanListingPhotoForMalware");
      expect(uploadPath).toContain("moderateListingPhotoImage");
    }
    expect(listingUpload).toContain("cleanupUploadedPhotos");
    expect(bookingActions).toContain("cleanupStoredPhotoUrl");
    expect(checklist).toContain("[x] Add upload byte verification, MIME sniffing, malware scanning, image moderation, and storage cleanup");
  });

  test("protects sensitive tax, payout, identity, and account-setting data at the field level", async () => {
    const [env, productionEnv, fieldProtection, accountSettings, taxProtection, checklist] = await Promise.all([
      readRepoFile("lib/env.ts"),
      readRepoFile(".env.production.example"),
      readRepoFile("lib/field-protection.ts"),
      readRepoFile("lib/account-settings.ts"),
      readRepoFile("lib/tax-id-protection.ts"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(env).toContain("FIELD_LEVEL_ENCRYPTION_KEY is required for production field-level encryption.");
    expect(productionEnv).toContain("FIELD_LEVEL_ENCRYPTION_KEY=");
    expect(fieldProtection).toContain('createCipheriv("aes-256-gcm"');
    expect(fieldProtection).toContain('createHmac("sha256"');
    expect(accountSettings).toContain("protectPersonalInfoForStorage");
    expect(accountSettings).toContain("protectFinancialSettingsForStorage");
    expect(accountSettings).toContain("protectWorkTravelForStorage");
    expect(accountSettings).toContain("protectPrivacyForStorage");
    expect(accountSettings).toContain("financialSettingsNeedProtection");
    expect(accountSettings).toContain("workTravelNeedsProtection");
    expect(accountSettings).toContain("privacyNeedsProtection");
    expect(taxProtection).toContain("fieldToken");
    expect(checklist).toContain("[x] Add field-level encryption or tokenization for sensitive tax, payout, identity, and account-setting data");
  });

  test("enforces session revocation, privileged MFA, and device management", async () => {
    const [schema, migration, auth, authActions, socialCallback, loginSecurityPage, loginSecurityActions, checklist] = await Promise.all([
      readRepoFile("prisma/schema.prisma"),
      readRepoFile("prisma/migrations/20260623203000_session_security_metadata/migration.sql"),
      readRepoFile("lib/auth.ts"),
      readRepoFile("app/auth/actions.ts"),
      readRepoFile("app/auth/callback/route.ts"),
      readRepoFile("app/account-settings/login-and-security/page.tsx"),
      readRepoFile("app/account-settings/login-and-security/actions.ts"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(schema).toContain("model AuthSession");
    expect(schema).toContain("userAgent");
    expect(schema).toContain("mfaVerifiedAt");
    expect(migration).toContain('ALTER TABLE "AuthSession" ADD COLUMN IF NOT EXISTS "userAgent"');
    expect(auth).toContain("clearAllSessionsForUserExceptCurrent");
    expect(auth).toContain("revokeSessionForUser");
    expect(auth).toContain("listActiveSessionsForUser");
    expect(authActions).toContain('user.role === "admin" || user.role === "host"');
    expect(authActions).toContain("sendPrivilegedMfaEmail");
    expect(socialCallback).toContain('appUser.role === "host"');
    expect(socialCallback).toContain("pendingAdminMfaCookie");
    expect(loginSecurityPage).toContain("Active sessions");
    expect(loginSecurityPage).toContain("revokeAccountSession");
    expect(loginSecurityActions).toContain("revokeOtherAccountSessions");
    expect(checklist).toContain("[x] Add session revocation, session rotation on privilege changes, admin/host MFA, and a device/session management screen");
  });

  test("uses a nonce-based CSP compatible with Next, Stripe, Sentry, maps, and analytics", async () => {
    const [proxy, layout, jsonLd, csp, checklist] = await Promise.all([
      readRepoFile("proxy.ts"),
      readRepoFile("app/layout.tsx"),
      readRepoFile("components/seo/json-ld.tsx"),
      readRepoFile("lib/content-security-policy.ts"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(proxy).toContain("createCspNonce");
    expect(proxy).toContain("requestHeaders.set(cspNonceHeaderName, nonce)");
    expect(proxy).toContain('requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)');
    expect(layout).toContain('export const dynamic = "force-dynamic"');
    expect(layout).toContain("headers()).get(cspNonceHeaderName)");
    expect(jsonLd).toContain("nonce={nonce}");
    expect(csp).toContain("script-src-elem");
    expect(csp).not.toContain("'strict-dynamic'");
    expect(csp).toContain("https://js.stripe.com");
    expect(csp).toContain("https://*.ingest.sentry.io");
    expect(csp).toContain("https://a.tile.openstreetmap.org");
    expect(csp).toContain("https://*.basemaps.cartocdn.com");
    expect(csp).toContain("https://va.vercel-scripts.com");
    expect(csp).toContain("https://vitals.vercel-insights.com");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(checklist).toContain("[x] Add a nonce/hash-based Content-Security-Policy compatible with Next.js, Stripe, Sentry, maps, and analytics");
  });

  test("documents safe dependency updates and separate major-upgrade review", async () => {
    const [packageJson, review, checklist] = await Promise.all([
      readRepoFile("package.json"),
      readRepoFile("docs/dependency-upgrade-review.md"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(packageJson).toContain('"next": "16.2.9"');
    expect(packageJson).toContain('"react": "19.2.7"');
    expect(packageJson).toContain('"@types/node": "^20.19.43"');
    expect(packageJson).toContain('"prisma": "^6.19.3"');
    expect(packageJson).toContain('"typescript": "^5"');
    expect(packageJson).toContain('"eslint": "^9"');
    expect(review).toContain("Prisma 7");
    expect(review).toContain("TypeScript 6");
    expect(review).toContain("ESLint 10");
    expect(review).toContain("Node type major");
    expect(review).toContain("@supabase/ssr");
    expect(review).toContain("sharp");
    expect(checklist).toContain("[x] Apply safe patch/minor dependency updates, then separately review Prisma, TypeScript, ESLint, and Node type major upgrades");
  });

  test("keeps the above-the-fold host preview image eager and preloaded", async () => {
    const [listingRail, hostAddressFlow, checklist] = await Promise.all([
      readRepoFile("components/home/listing-rail.tsx"),
      readRepoFile("components/forms/host-address-flow.tsx"),
      readRepoFile("docs/project-checklist.md"),
    ]);

    expect(listingRail).toContain('src="/host-preview-house.jpg"');
    expect(listingRail).toContain("preload={index === 0}");
    expect(listingRail).toContain('fetchPriority={index === 0 ? "high" : undefined}');
    expect(listingRail).toContain('loading="eager"');
    expect(hostAddressFlow).toContain('src="/host-preview-house.jpg"');
    expect(hostAddressFlow).toContain("preload");
    expect(hostAddressFlow).toContain('fetchPriority="high"');
    expect(hostAddressFlow).toContain('loading="eager"');
    expect(checklist).toContain("[x] Fix remaining above-the-fold image priority/eager-loading warning for `/host-preview-house.jpg`");
  });

  test("keeps ERP date and time formatting tolerant of legacy listing data", async () => {
    const erpPage = await readRepoFile("app/host/erp/[section]/page.tsx");

    expect(erpPage).toContain("function parseClockTime(value: string)");
    expect(erpPage).toContain("AM|PM");
    expect(erpPage).toContain('return value.trim() || "Time unavailable";');
    expect(erpPage).toContain('return value || "Date unavailable";');
  });

  test("guards ERP mutation forms with signed CSRF tokens", async () => {
    const [erpActions, erpPage, customerClassificationSelect] = await Promise.all([
      readRepoFile("app/host/erp/[section]/actions.ts"),
      readRepoFile("app/host/erp/[section]/page.tsx"),
      readRepoFile("components/host/customer-classification-select.tsx"),
    ]);

    expect(erpActions).toContain('import { assertValidCsrfForm } from "@/lib/csrf";');
    const normalizedErpActions = erpActions.replace(/\r\n/g, "\n");
    [
      "createManualLead",
      "updateManualLead",
      "updateLeadStatus",
      "archiveManualLead",
      "updateCustomerClassification",
      "createExternalReservation",
    ].forEach((actionName) => {
      expect(normalizedErpActions).toContain(`export async function ${actionName}(formData: FormData) {\n  await assertTrustedRequestOrigin();\n  await assertValidCsrfForm(formData);`);
    });
    expect(erpPage).toContain('import { csrfFieldName, getCsrfToken } from "@/lib/csrf";');
    expect(erpPage).toContain("getCsrfToken()");
    expect(erpPage).toContain('name={csrfFieldName} value={csrfToken}');
    expect(customerClassificationSelect).toContain('import { csrfFieldName } from "@/lib/csrf-fields";');
    expect(customerClassificationSelect).toContain('name={csrfFieldName} value={csrfToken}');
  });

  test("configures API CORS through an explicit allowlist", async () => {
    const [cors, proxy, productionEnv] = await Promise.all([
      readRepoFile("lib/cors.ts"),
      readRepoFile("proxy.ts"),
      readRepoFile(".env.production.example"),
    ]);

    expect(cors).toContain("API_CORS_ALLOWED_ORIGINS");
    expect(cors).toContain('origin !== "*"');
    expect(cors).toContain('process.env.NODE_ENV === "production" && url.protocol !== "https:"');
    expect(cors).not.toContain("Access-Control-Allow-Credentials");
    expect(proxy).toContain('request.method === "OPTIONS"');
    expect(proxy).toContain("corsHeaders(request.headers.get(\"origin\"))");
    expect(productionEnv).toContain('API_CORS_ALLOWED_ORIGINS=""');
  });

  test("documents production monitoring and provider alerts", async () => {
    const [env, monitoring] = await Promise.all([
      readRepoFile("lib/env.ts"),
      readRepoFile("docs/monitoring-alerts.md"),
    ]);

    expect(env).toContain("SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN are required for production monitoring.");
    expect(monitoring).toContain("Provider Alert Rules");
    expect(monitoring).toContain("Sentry");
    expect(monitoring).toContain("Vercel");
    expect(monitoring).toContain("Database provider");
    expect(monitoring).toContain("Upstash Redis");
    expect(monitoring).toContain("Manual payment operations");
    expect(monitoring).toContain("PayMongo");
    expect(monitoring).toContain("Resend");
    expect(monitoring).toContain("Cloudinary or Blob storage");
    expect(monitoring).toContain("Privacy scrubbing must stay enabled");
  });
});
