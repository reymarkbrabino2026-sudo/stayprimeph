# StayPrime PH Security, QA, Architecture, and Workflow Audit

Date: 2026-06-07

Scope: local source review, dependency review, simulated unauthenticated probes against the local app, in-app browser smoke testing, unit/integration/E2E verification, and safe remediation.

## Executive Summary

Overall rating after remediation: **Medium Risk**.

Pre-fix posture was **High Risk** because public listing pages could expose non-approved listings and host email addresses, manual payment submissions could understate the server-side booking total, transactional emails interpolated unescaped HTML, and booking creation had a race-condition gap.

Post-fix posture is materially better: the highest-impact safe issues were fixed, known-vulnerability SCA is clean, protected routes and sensitive APIs reject unauthenticated access, and the full verification suite passes. Remaining risk is mostly launch-hardening work: persistent audit logs, stronger session lifecycle controls, explicit CSRF/origin defenses for custom POST APIs, production-only database constraints for booking conflicts, and direct-upload content verification.

## Verification Evidence

- `npm.cmd audit --json`: 0 critical, 0 high, 0 moderate, 0 low vulnerabilities.
- `npm.cmd outdated --json`: patch updates available; major-version review available for Prisma 7, ESLint 10, TypeScript 6, and Node types 25.
- `npx.cmd depcheck --json`: no unused production dependencies; dev false positives for Tailwind/testing packages; missing `@next/env` fixed.
- License scan: no unknown licenses. Most packages are MIT/Apache/BSD/ISC. One transitive package, `@img/sharp-win32-x64`, reports `Apache-2.0 AND LGPL-3.0-or-later`; keep this in legal review for distribution obligations.
- Secret scan of working tree and Git history with length-aware patterns: no real Stripe, Vercel Blob, AWS, Google API, or private-key secrets found. Placeholder values such as `sk_live_...` appear in docs/examples only.
- Browser smoke: `http://localhost:3000/rooms/42b8ae68-c9df-45f6-80c4-93a31e935c66` rendered successfully, showed `Contact through StayPrimePH`, and did not expose host email text.
- Simulated unauthenticated probes:
  - `/admin/dashboard`: 307 to `/login?role=admin&next=%2Fadmin%2Fdashboard`
  - `/host/dashboard`: 307 to `/login?role=host&next=%2Fhost%2Fdashboard`
  - `/guest/dashboard`: 307 to `/login?role=guest&next=%2Fguest%2Fdashboard`
  - `POST /api/payments/checkout`: 401
  - `POST /api/uploads/listing-photo`: 401
  - oversized `/api/geocode`: 400
  - invalid `/api/geocode/reverse`: 400
  - HSTS header present on probed responses.

Final verification commands:

```text
npm.cmd run lint                   PASS
npx.cmd tsc --noEmit               PASS
npm.cmd run test                   PASS, 10 files / 24 tests
npm.cmd run test:e2e               PASS, 38 tests
npm.cmd run build                  PASS
```

## Fixed Issues

### 1. High - Non-approved listings could be directly rendered

Location: `app/rooms/[id]/page.tsx:96`, `app/rooms/[id]/page.tsx:100`

Description: Public direct access to `/rooms/[id]` rendered listings without checking `status`.

Risk: Pending or rejected host listings could leak content, location, house rules, photos, and pricing before admin approval.

Reproduction: Request `/rooms/{pending-or-rejected-property-id}` while logged out.

Recommended fix: Only approved listings should render publicly. Hosts may preview their own listings, and admins may preview all listings.

Code fix: Added `getCurrentUser()` and a `canPreviewListing` gate; metadata now returns a not-found title for non-approved listings.

### 2. Medium - Public room page exposed host email

Location: `app/rooms/[id]/page.tsx:378`

Description: The public host panel rendered `host?.email`.

Risk: Host email addresses could be scraped or contacted off-platform, increasing privacy and fraud risk.

Reproduction: Open an approved listing page and inspect the host panel.

Recommended fix: Route communication through the platform until a booking relationship justifies disclosure.

Code fix: Replaced direct email display with `Contact through StayPrimePH`.

### 3. Medium - Transactional email HTML injection

Location: `lib/email.ts:9`, `lib/email.ts:40`, `lib/email.ts:48`, `lib/email.ts:56`, `lib/email.ts:64`, `lib/email.ts:72`

Description: Names, listing titles, dates, and status values were interpolated into raw HTML email strings without escaping.

Risk: User-controlled content could alter email markup, phish users, or execute in permissive mail clients.

Reproduction: Register or create a listing using HTML-like text and trigger a transactional email.

Recommended fix: Escape user-controlled values before inserting them into HTML and encode URL path tokens.

Code fix: Added `escapeHtml()` and used it in all email HTML templates; encoded verification/reset tokens.

### 4. High - Manual payment amount tampering

Location: `lib/payments.ts:85`, `tests/unit/payments.test.ts:58`

Description: Manual payment submissions accepted any positive amount.

Risk: A guest could submit an underpayment and rely on host error, leading to unpaid confirmed bookings.

Reproduction: Submit manual payment details with `amount` lower than `booking.totalPrice`.

Recommended fix: Compare submitted payment amount with the server-calculated booking total.

Code fix: `submitManualPayment()` now rejects mismatched amounts; added a unit test.

### 5. High - Booking race condition gap

Location: `lib/repositories.ts:180`, `lib/repositories.ts:189`, `lib/repositories.ts:206`, `app/bookings/checkout/[propertyId]/actions.ts`

Description: Booking conflict detection happened before persistence and could be stale during concurrent requests.

Risk: Double booking or inconsistent availability under concurrent checkout attempts.

Reproduction: Submit two overlapping bookings for the same property concurrently.

Recommended fix: Re-check overlap inside the database write boundary and use strong isolation where supported.

Code fix: Prisma booking creation now checks overlap inside a serializable transaction; JSON fallback re-reads before write.

### 6. Medium - Stripe paid state and payment record were not atomic

Location: `lib/repositories.ts`

Description: `updateBookingPaymentInDatabase()` updated booking state and upserted payment data in separate operations.

Risk: Partial failure could mark a booking paid without a matching payment record or vice versa.

Reproduction: Simulate a database failure between the booking update and payment upsert.

Recommended fix: Commit booking and payment changes in one transaction.

Code fix: Wrapped the booking update and raw payment upsert in `prisma.$transaction()`.

### 7. Medium - Account email update lacked server-side validation and uniqueness checks

Location: `lib/account-settings.ts:70`, `lib/account-settings.ts:313`, `lib/account-settings.ts:317`, `lib/account-settings.ts:321`, `lib/account-settings.ts:324`, `lib/account-settings.ts:338`

Description: Account settings could write malformed or duplicate emails, especially in JSON persistence.

Risk: Login ambiguity, failed Prisma writes, data corruption, and account recovery confusion.

Reproduction: Save an invalid or already-used email through account settings.

Recommended fix: Validate email format and reject duplicates before writing.

Code fix: Added `isValidEmail()`, Prisma duplicate lookup, and JSON duplicate detection.

### 8. Low - Edge session HMAC used normal string equality

Location: `proxy.ts:51`, `proxy.ts:69`

Description: Middleware compared HMAC strings with `===`.

Risk: Low-probability timing side channel on session signature checks.

Reproduction: Repeatedly probe a protected route with crafted session signatures and measure response timing.

Recommended fix: Use constant-time comparison.

Code fix: Added `constantTimeEqual()` and used it in session validation.

### 9. Low - HSTS header missing

Location: `next.config.ts:24`, `proxy.ts:25`

Description: Existing security headers omitted `Strict-Transport-Security`.

Risk: Users could be downgraded to HTTP on first-party domains that support HTTPS.

Reproduction: Inspect response headers.

Recommended fix: Add HSTS for production HTTPS deployments.

Code fix: Added `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### 10. Low - Geocode input validation too loose

Location: `app/api/geocode/route.ts:27`, `app/api/geocode/reverse/route.ts:36`, `tests/integration/geocode-route.test.ts:15`, `tests/integration/geocode-route.test.ts:23`

Description: Forward geocoding accepted unbounded strings; reverse geocoding accepted non-numeric/out-of-range coordinates.

Risk: Unnecessary upstream load, poor error handling, and avoidable abuse surface.

Reproduction: Call `/api/geocode?query=` with very long strings or reverse geocode with `latitude=999&longitude=abc`.

Recommended fix: Reject oversized queries and invalid coordinate ranges locally.

Code fix: Added local validation and integration tests.

### 11. Low - Missing direct dependency declaration

Location: `scripts/check-env.mjs:1`, `package.json:59`

Description: `scripts/check-env.mjs` imported `@next/env`, but the package was not declared directly.

Risk: Environment checks could break if transitive dependency layout changes.

Reproduction: Run `depcheck`; `@next/env` appears as missing.

Recommended fix: Declare `@next/env` in dev dependencies.

Code fix: Added `@next/env@16.2.6`.

### 12. Low - E2E test fragility

Location: `tests/e2e/auth.spec.ts:9`, `tests/e2e/host.spec.ts:68`

Description: One test matched Next's route announcer and another used a short redirect assertion.

Risk: False-negative QA runs obscure real regressions.

Reproduction: Run E2E under a cold Next dev server.

Recommended fix: Use role-based heading assertion and explicit redirect wait.

Code fix: Updated E2E locators and redirect wait.

## SAST Findings That Were Already Strong

- Route layouts enforce role checks for guest, host, and admin dashboards.
- Server actions for booking approval, payment confirmation, reviews, and messaging check current user role and ownership.
- Password reset and email verification tokens are random, hashed at rest, single-use, and one-hour expiry.
- Passwords are bcrypt-hashed with cost 12 for new hashes.
- Stripe checkout amount comes from server-side booking total; webhook verifies Stripe signature, currency, and amount.
- Listing-photo upload route checks role, rate limit, MIME type, extension, size, and magic bytes for server-mediated uploads.
- React rendering avoids `dangerouslySetInnerHTML`; user-generated page content is escaped by React.
- Prisma/raw SQL usage is parameterized; no string-built SQL injection path was found.

## Remaining Risks and Recommendations

### High Priority

1. Persistent audit logs are incomplete. `AdminLog` exists in Prisma but most events only use `logger`. Persist login, logout, failed login, registration, password reset, listing approval, booking actions, payment decisions, permission changes, and admin actions without passwords, tokens, card data, or full PII.
2. Add database-level booking conflict enforcement. The new serializable transaction reduces the race, but PostgreSQL range/exclusion constraints or per-night availability holds would make double booking prevention stronger and easier to prove.
3. Add explicit CSRF/origin validation to custom POST APIs and high-risk server actions. SameSite cookies and Next server-action protections help, but payment, upload, admin, and account mutations should reject unexpected origins.
4. Direct Vercel Blob browser uploads are disabled for listing photos. Keep listing photo uploads on the server-mediated route so MIME type, extension, size, and magic-byte checks run before public storage writes.

### Medium Priority

1. Add session revocation and rotation. Current signed cookies are stateless until expiry; add server-side session records or token versioning for logout-all-devices, password-change invalidation, and role-change invalidation.
2. Strengthen auth policy. Password minimum is 8 characters; add breached-password checks, optional MFA for hosts/admins, progressive lockout, and monitoring for credential stuffing.
3. Add registration/account-enumeration hardening. Login and password reset are mostly generic, but registration duplicate handling still confirms account existence.
4. Add message and inquiry abuse controls. Messaging actions validate ownership/roles, but should also enforce per-user send rate, maximum length, report/block controls, and spam scoring.
5. Move all production persistence to Prisma/Postgres. JSON and Blob-backed stores are acceptable for demo/dev but not for high-concurrency production workflows.
6. Add structured security tests for negative authorization: guest cannot access host/admin data, host cannot access another host's listing/booking, guest cannot pay another guest's booking, and admin actions fail for non-admins.

### Low Priority

1. Consider a nonce-based Content Security Policy. Add only after testing Next/Sentry/analytics inline script needs.
2. Review image optimization and LCP hints. Playwright reported `/host-preview-house.jpg` as LCP and recommended eager loading if above the fold.
3. Keep dependency patch updates current: Next 16.2.7, React 19.2.7, React DOM 19.2.7, Stripe 22.2.0, Sentry 10.56.0, Supabase JS 2.107.0, Vitest 4.1.8, and other patch updates from `npm outdated`.
4. Review major upgrades separately: Prisma 7, ESLint 10, TypeScript 6, and Node type packages may require migration work.

## Scores

Security scores, post-fix:

- Authentication: 7.5/10
- Authorization: 8.0/10
- Data Security: 7.0/10
- API Security: 7.5/10
- Booking Security: 7.0/10
- Payment Security: 7.5/10
- Overall Security: 7.4/10

QA scores, post-fix:

- UI Quality: 8.0/10
- Workflow Quality: 8.0/10
- Reliability: 7.5/10
- Mobile: 8.0/10
- Accessibility: 8.0/10
- Overall Product Quality: 7.9/10

## Final Remediation Status

Safe issues fixed:

- Public listing approval bypass
- Host email exposure
- Transactional email HTML injection
- Manual payment amount tampering
- Booking conflict stale-read/race gap
- Stripe payment write atomicity
- Account email validation/uniqueness
- Edge HMAC comparison timing hardening
- Missing HSTS
- Geocode validation gaps
- Missing direct `@next/env` dependency
- E2E flakiness in auth/redirect assertions

Remaining risks:

- Persistent audit logging is not complete.
- CSRF/origin checks should be explicit on custom mutations.
- Database-level booking exclusion constraints are still recommended.
- Direct Blob upload byte verification is still needed.
- Session revocation/MFA/stronger auth controls remain launch hardening.

Recommended next actions:

1. Implement persistent `AdminLog` writes for all audit-worthy actions.
2. Add a Postgres availability hold or exclusion-constraint design for bookings.
3. Add origin/CSRF enforcement helpers and tests for custom POST APIs/server actions.
4. Add direct Blob upload verification in `onUploadCompleted`.
5. Expand negative authorization test coverage across guest/host/admin boundaries.
