# StayPrimePH launch checklist

Use this as the active tracker for what is done, what is configured, and what still needs work before real public bookings/payments.

Last updated: 2026-06-24.

## Launch gate

Do not expose StayPrimePH to real users, public marketing traffic, real bookings, or real payments until every launch blocker in this checklist is closed and the full verification checklist passes on the production or production-like environment. A ready Vercel deployment is not enough by itself.

## Status key

| Marker | Meaning |
| --- | --- |
| `[x]` | Done |
| `[ ]` | Not done yet |
| Manual provider/account setup | Requires provider-dashboard, legal, payment, domain, or account evidence outside the codebase |
| Product/code work | Requires an app, database, test, or documentation change in the repository |

## Current launch blockers

- [x] Apply and verify all production Prisma migrations; failed-login and demo-credential checks return normal auth errors, not the app error page.
- [x] Update E2E tests for the current email-verification, strong-password, and no-auto-login signup flows, then make `npm run test:e2e` pass.
- [x] Re-run the full verification checklist after the E2E fixes.
- [x] Verify seeded/demo credentials do not authenticate and do not trigger server errors.
- [x] Create or approve at least one production listing for public search, listing detail, booking, checkout, and email QA.
- [x] Decide payment launch mode: use manual GCash/bank-transfer payment collection for now; PayMongo online checkout is planned but not yet set up.
- [x] Complete remaining external launch signoff: Sentry, Vercel Analytics, and Upstash provider telemetry confirmed on 2026-06-24 with smoke ID `telemetry-smoke-2026-06-24-1782239956441`. Qualified legal/privacy counsel review, responsible privacy contact confirmation, physical iPhone/Android/desktop QA, and confirmation-email delivery QA are complete; app-side legal/status/device/log checks were refreshed on 2026-06-19.

## Live site and deployment

- [x] `stayprimeph.com` returns `200 OK`
- [x] GitHub connected: `reymarkbrabino2026-sudo/stayprimeph`
- [x] Vercel connected to the `main` branch
- [x] Vercel framework set to Next.js
- [x] Production domain connected
- [x] Latest production deployment is Ready
- [x] Latest production deployment with Prisma migrations is Ready and aliased to `stayprimeph.com`

## Automated checks

- [x] `npm run lint` passed
- [x] `npm run type-check` passed
- [x] `npm run test` passed: 224 tests across 51 files
- [x] `npm run test:e2e` passed: 36 passed, 8 skipped
- [x] `npm run build:prod` passed with sanitized build-time placeholders
- [x] Vercel production build/deploy passed for the latest committed launch-gate update
- [x] `npm audit --omit=dev` found 0 vulnerabilities
- [x] Hosted production smoke checks passed for public pages, protected-route redirects, unauthenticated API rejection, and security headers
- [x] Distributed rate limiting verified on production: latest 35 parallel `/api/geocode` requests returned 30 validation responses and 5 `429` responses
- [x] Secret scan of tracked files and Git history found placeholders/examples only; real `.env*`, `.vercel`, `.next`, logs, `node_modules`, and test results are not tracked
- [x] Demo credential verification passed after production migrations: `guest@stayprimeph.com`, `host@stayprimeph.com`, and `admin@stayprimeph.com` all return normal auth errors and do not authenticate
- [x] `robots.txt` works
- [x] `sitemap.xml` works
- [x] `manifest.webmanifest` works
- [x] `favicon.ico` works

## Database and persistence

- [x] PostgreSQL database connected
- [x] `DATABASE_URL` configured in Vercel
- [x] `DIRECT_URL` configured in Vercel
- [x] `PERSISTENCE_DRIVER=prisma` configured in production
- [x] Production is no longer using JSON/demo persistence
- [x] Production Prisma migration drift recovered through Vercel production build using Prisma `migrate resolve` for pre-existing tables and `migrate deploy` for pending migrations
- [x] All production Prisma migrations applied successfully through `20260618175000_immutable_listing_audit_logs`
- [x] `/search` returns `200 OK` with Prisma persistence enabled

## Provider setup and integration tests

- [x] Vercel Blob configured for real listing photo uploads
- [x] Real listing photo upload tested in production
- [x] Manual GCash/bank-transfer payment flow is the current payment setup
- [x] Manual payment submissions collect amount, method, receipt, reference number, and notes for host/admin review
- [x] Manual payment review can mark bookings paid after host/admin verification
- [x] Public `/status` page shows generic platform availability as `Operational`; hosted provider checkout remains disabled until PayMongo is implemented and verified
- [x] PayMongo selected as the future online payment provider
- [x] PayMongo setup guide prepared in `docs/paymongo-setup-guide.md`
- [x] Legacy Stripe checkout/webhook code remains disabled and is not the launch payment provider
- [ ] Future online checkout: PayMongo account created and business verification completed
- [ ] Future online checkout: PayMongo Hosted Checkout and webhook integration built
- [ ] Future online checkout: PayMongo test checkout, webhook signature verification, refund, and reconciliation tested end to end
- [ ] Future online checkout: PayMongo live keys and webhook configured in Vercel Production
- [ ] Future online checkout: first low-value PayMongo live payment tested end to end
- [ ] Future online checkout: first live PayMongo payment refunded or reconciled, if it was only a launch test
- [x] Resend API key configured in Vercel Production
- [x] Resend sender/domain verified
- [x] Email provider configuration and transactional email flows have been tested; public `/status` no longer exposes internal email readiness
- [x] Welcome email tested
- [x] Email verification tested
- [x] Password reset email tested
- [x] Booking email tested
- [x] Upstash Redis configured for real distributed rate limiting
- [x] Sentry server DSN configured
- [x] Sentry browser/public DSN configured
- [x] Sentry error capture tested
- [x] Vercel Analytics enabled and verified
- [x] Supabase Google provider enabled in Supabase
- [x] Google login button reaches Google sign-in
- [x] Google login tested end to end with a real account
- [x] Supabase Facebook provider enabled in Supabase
- [x] Supabase Auth Site URL set to `https://stayprimeph.com`
- [x] Supabase Auth redirect URL includes `https://stayprimeph.com/auth/callback`
- [x] Facebook redirect no longer goes to the protected Vercel deployment URL
- [x] Facebook `email` permission enabled for testing
- [x] Facebook login button reaches Facebook consent/sign-in
- [x] Facebook login tested end to end with a real account

## Meta/Facebook public launch setup

Runbook and evidence requirements: `docs/meta-facebook-public-launch.md`.

- [x] Meta app created
- [x] Meta app domain includes `stayprimeph.com`
- [x] Meta app domain includes Supabase callback domain `iiqbmcycsdaukoigsqfx.supabase.co`
- [x] Meta valid OAuth redirect URI includes `https://iiqbmcycsdaukoigsqfx.supabase.co/auth/v1/callback`
- [x] Meta Privacy Policy URL set to `https://stayprimeph.com/legal/privacy`
- [x] Meta Terms URL set to `https://stayprimeph.com/legal/terms`
- [x] Meta data deletion page created at `https://stayprimeph.com/legal/data-deletion`
- [x] Meta data deletion URL added in Meta Basic settings
- [x] Meta app category set
- [x] `1024 x 1024` Meta app icon asset created in the codebase
- [x] Meta app icon uploaded in Meta dashboard; evidence recorded in `docs/meta-facebook-public-launch.md`
- [x] Meta app published/live; evidence recorded in `docs/meta-facebook-public-launch.md`
- [x] Meta Login Review submitted/approved or confirmed not required for public Facebook login; evidence recorded in `docs/meta-facebook-public-launch.md`

## Product/code items still needed

- [x] Harden protected routes in `proxy.ts` so admin/host/guest pages cannot stream protected HTML before redirect
- [x] Full security, vulnerability, and QA audit completed in `docs/stayprimeph-full-security-vulnerability-qa-audit-2026-06-07.md`
- [x] Public room pages now hide non-approved listings from everyone except admin and owning host
- [x] Public room pages no longer expose host email addresses
- [x] Transactional email HTML now escapes interpolated fields and URL-encodes email tokens
- [x] Manual payment submissions validate the submitted amount against the booking total and keep partial payments in review until fully paid
- [x] Booking creation now re-checks date overlap inside a serializable Prisma transaction
- [x] Stripe booking/payment update path is transaction-wrapped
- [x] HSTS and core security headers configured in middleware and Next headers
- [x] Session HMAC verification uses constant-time comparison
- [x] Geocode endpoints reject oversized queries and invalid coordinates
- [x] Account profile email updates validate format and duplicate ownership server-side
- [x] Replace legal placeholder/review-needed copy in `lib/legal-data.ts`
- [x] Replace listing map placeholder in `components/listings/map-section.tsx`
- [x] Convert browser/local-storage account settings into full backend-backed account management where needed
- [x] Decide whether Experiences and Services stay as navigation labels or become full separate marketplace products
- [x] Fix remaining above-the-fold image priority/eager-loading warning for `/host-preview-house.jpg`
- [x] Internal legal/privacy readiness pass completed and documented in `docs/legal-privacy-review.md`
- [x] Public Terms, Privacy Policy, and Data Deletion pages strengthened for launch readiness
- [x] Real-device QA runbook prepared in `docs/real-device-qa.md`
- [x] Automated production device-emulation QA completed and documented in `docs/automated-device-qa-report.md`
- [x] Final monitoring QA runbook prepared in `docs/final-monitoring-qa.md`
- [x] Sentry browser instrumentation moved to `instrumentation-client.ts` for the Next 16 Turbopack build
- [x] Live `/status` page is generic and shows platform, guest, host, and support availability as Operational
- [x] Vercel production logs access verified
- [x] Automated production device-emulation QA refreshed on 2026-06-19 across iPhone 13, Pixel 5, and desktop profiles with 30 checks and 0 failures
- [x] Production search has at least one approved public listing available for listing-detail, booking, and checkout QA: 3 public listings are visible on `stayprimeph.com/search`; checkout handoff verified for listing `46d34c9c-ae54-4ca5-9286-1ec6452b58c1`

## Security hardening still needed

- [x] Add a database-level booking overlap invariant: package-aware `BookingResourceLock` rows are maintained by PostgreSQL triggers and protected by a GiST exclusion constraint
- [x] Wire persistent `AdminLog` records across admin approvals, user changes, listing changes, payment review, disputes, and settings
- [x] Add a shared CSRF/origin guard for custom non-webhook state-changing POST routes
- [x] Add upload byte verification, MIME sniffing, malware scanning, image moderation, and storage cleanup
- [x] Add field-level encryption or tokenization for sensitive tax, payout, identity, and account-setting data
- [x] Add session revocation, session rotation on privilege changes, admin/host MFA, and a device/session management screen
- [x] Add a nonce/hash-based Content-Security-Policy compatible with Next.js, Stripe, Sentry, maps, and analytics
- [x] Apply safe patch/minor dependency updates, then separately review Prisma, TypeScript, ESLint, and Node type major upgrades

## User/account setup still needed

- [x] Database provider account created
- [x] Supabase/Postgres connected to Vercel
- [x] Vercel Blob storage ready
- [x] Manual GCash/bank-transfer payment collection ready
- [x] Resend sender/domain ready
- [x] Upstash Redis account/database ready
- [x] Sentry project ready
- [x] Business/legal operator contact details confirmed and added to public policies
- [x] Qualified legal/privacy counsel review completed
- [x] Data privacy officer or responsible privacy contact confirmed
- [x] Real device QA completed on iPhone
- [x] Real device QA completed on Android
- [x] Real device QA completed on desktop

## Final launch smoke test

- [x] Register a new guest account on production
- [x] Verify guest email on production
- [x] Log in and log out on production
- [x] Reset password on production
- [x] Create a host account on production
- [x] Create a listing with real hosted photos
- [x] Approve the listing in admin
- [x] Search for the approved listing on production
- [x] Open listing details on production
- [x] Start checkout from a production listing
- [x] Submit manual GCash/bank-transfer payment details with receipt/reference
- [x] Confirm booking appears for guest
- [x] Confirm booking appears for host
- [x] Confirm payment appears in admin
- [x] Confirm confirmation emails are delivered
- [x] Confirm production rate-limit telemetry through live `429` behavior
- [x] Confirm Vercel production logs show recent smoke-test activity
- [x] Confirm Sentry, Vercel Analytics, and Upstash provider telemetry show expected smoke-test activity

## Current launch verdict

- [x] Demo/live-preview ready
- [x] Ready for real bookings with manual GCash/bank-transfer payment collection
- [ ] Ready for hosted online payments through PayMongo
- [x] Ready for public marketing launch for the current manual-payment flow

The launch gate is closed for the current manual-payment public launch path. The latest verification confirmed production Prisma migrations, normal failed-login behavior, demo credential rejection, lint, type-check, unit/integration tests, E2E coverage for current signup/auth flows, dependency audit, hosted smoke checks, security headers, no committed secrets, production deployment health, distributed Upstash rate limiting, production listing/search/detail/checkout handoff readiness, manual payment as the current payment setup, hosted provider checkout disabled until PayMongo is implemented, refreshed public legal/status/support checks, refreshed device-emulation QA, Vercel log visibility, qualified legal/privacy counsel review, responsible privacy contact confirmation, physical iPhone/Android/desktop QA, confirmation-email delivery QA, and June 24 Sentry, Vercel Analytics, and Upstash telemetry signoff. PayMongo hosted online payments remain future work and must stay disabled until implemented and verified.
