# StayPrimePH launch checklist

Use this as the active tracker for what is done, what is configured, and what still needs work before real public bookings/payments.

## Status key

- [x] Done
- [ ] Not done yet
- [ ] Needs manual provider/account setup
- [ ] Needs product/code work

## Live site and deployment

- [x] `stayprimeph.com` returns `200 OK`
- [x] GitHub connected: `reymarkbrabino2026-sudo/stayprimeph`
- [x] Vercel connected to the `main` branch
- [x] Vercel framework set to Next.js
- [x] Production domain connected
- [x] Latest production deployment is Ready

## Automated checks

- [x] `npm run lint` passed
- [x] `npm run test` passed: 21 tests
- [x] `npm run test:e2e` passed: 38 tests
- [x] `npm run build` passed
- [x] `npm audit --audit-level=high` found 0 high vulnerabilities
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
- [x] Prisma migrations run before Vercel production build
- [x] Prisma migrations applied successfully in production
- [x] `/search` returns `200 OK` with Prisma persistence enabled

## Provider setup and integration tests

- [x] Vercel Blob configured for real listing photo uploads
- [x] Real listing photo upload tested in production
- [x] Stripe checkout UI wired to the server checkout route
- [x] Stripe test keys configured in Vercel Production
- [x] Stripe webhook configured at `https://stayprimeph.com/api/payments/webhook`
- [x] Stripe webhook signature check verified in production
- [x] `/status` shows Payments as `Operational`
- [x] Stripe sandbox checkout tested end to end
- [x] Resend API key configured in Vercel Production
- [x] Resend sender/domain verified
- [x] `/status` shows Email as `Operational`
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
- [ ] Meta app icon uploaded in Meta dashboard
- [ ] Meta app published/live
- [ ] Meta Login Review submitted/approved, if Meta requires it for public Facebook login

## Product/code items still needed

- [x] Harden protected routes in `proxy.ts` so admin/host/guest pages cannot stream protected HTML before redirect
- [x] Replace legal placeholder/review-needed copy in `lib/legal-data.ts`
- [x] Replace listing map placeholder in `components/listings/map-section.tsx`
- [x] Convert browser/local-storage account settings into full backend-backed account management where needed
- [x] Decide whether Experiences and Services stay as navigation labels or become full separate marketplace products
- [x] Fix above-the-fold image priority/eager-loading warnings from E2E/performance checks
- [x] Internal legal/privacy readiness pass completed and documented in `docs/legal-privacy-review.md`
- [x] Public Terms, Privacy Policy, and Data Deletion pages strengthened for launch readiness

## User/account setup still needed

- [x] Database provider account created
- [x] Supabase/Postgres connected to Vercel
- [x] Vercel Blob storage ready
- [x] Stripe test account ready
- [x] Resend sender/domain ready
- [x] Upstash Redis account/database ready
- [x] Sentry project ready
- [ ] Business/legal operator contact details confirmed and added to public policies
- [ ] Qualified legal/privacy counsel review completed
- [ ] Data privacy officer or responsible privacy contact confirmed
- [ ] Real device QA completed on iPhone
- [ ] Real device QA completed on Android
- [ ] Real device QA completed on desktop

## Final launch smoke test

- [x] Register a new guest account on production
- [x] Verify guest email on production
- [x] Log in and log out on production
- [x] Reset password on production
- [x] Create a host account on production
- [x] Create a listing with real hosted photos
- [x] Approve the listing in admin
- [x] Search for the approved listing
- [x] Open listing details
- [x] Start checkout
- [x] Complete Stripe sandbox payment
- [x] Confirm booking appears for guest
- [x] Confirm booking appears for host
- [x] Confirm payment appears in admin
- [ ] Confirm confirmation emails are delivered
- [ ] Confirm Sentry, analytics, logs, and rate-limit telemetry show activity

## Current launch verdict

- [x] Demo/live-preview ready
- [ ] Ready for real bookings
- [ ] Ready for real payments
- [ ] Ready for public marketing launch

The app is live and healthy. Database persistence, production listing photo uploads, Resend email configuration, Stripe sandbox checkout, core email QA, Sentry monitoring, Vercel Analytics, Upstash Redis rate limiting, Google/Facebook provider setup, Facebook redirect cleanup, host/admin booking checks, protected-route hardening, legal-page cleanup, legal/privacy readiness copy, map polish, nav cleanup, image-loading polish, and backend-backed account settings are now active. The remaining blockers are live Stripe mode, Meta app icon upload/publishing, business/legal contact details, qualified legal/privacy review, real device QA, and final confirmation-email telemetry.
