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
- [ ] Stripe test keys configured
- [ ] Stripe webhook configured at `https://stayprimeph.com/api/payments/webhook`
- [ ] Stripe sandbox checkout tested end to end
- [x] Resend API key configured in Vercel Production
- [x] Resend sender/domain verified
- [x] `/status` shows Email as `Operational`
- [ ] Welcome email tested
- [ ] Email verification tested
- [ ] Password reset email tested
- [ ] Booking email tested
- [ ] Upstash Redis configured for real distributed rate limiting
- [ ] Sentry server DSN configured
- [ ] Sentry browser/public DSN configured
- [ ] Sentry error capture tested
- [ ] Vercel Analytics enabled and verified
- [ ] Supabase Google login provider tested, if Google login is wanted
- [ ] Supabase Facebook login provider tested, if Facebook login is wanted

## Product/code items still needed

- [ ] Harden protected routes in `proxy.ts` so admin/host/guest pages cannot stream protected HTML before redirect
- [ ] Replace legal placeholder/review-needed copy in `lib/legal-data.ts`
- [ ] Replace listing map placeholder in `components/listings/map-section.tsx`
- [ ] Convert browser/local-storage account settings into full backend-backed account management where needed
- [ ] Decide whether Experiences and Services stay as navigation labels or become full separate marketplace products
- [ ] Fix above-the-fold image priority/eager-loading warnings from E2E/performance checks

## User/account setup still needed

- [x] Database provider account created
- [x] Supabase/Postgres connected to Vercel
- [x] Vercel Blob storage ready
- [ ] Stripe test account ready
- [x] Resend sender/domain ready
- [ ] Upstash Redis account/database ready
- [ ] Sentry project ready
- [ ] Legal/privacy review completed
- [ ] Real device QA completed on iPhone
- [ ] Real device QA completed on Android
- [ ] Real device QA completed on desktop

## Final launch smoke test

- [ ] Register a new guest account on production
- [ ] Verify guest email on production
- [ ] Log in and log out on production
- [ ] Reset password on production
- [ ] Create a host account on production
- [ ] Create a listing with real hosted photos
- [ ] Approve the listing in admin
- [ ] Search for the approved listing
- [ ] Open listing details
- [ ] Start checkout
- [ ] Complete Stripe sandbox payment
- [ ] Confirm booking appears for guest
- [ ] Confirm booking appears for host
- [ ] Confirm payment appears in admin
- [ ] Confirm confirmation emails are delivered
- [ ] Confirm Sentry, analytics, logs, and rate-limit telemetry show activity

## Current launch verdict

- [x] Demo/live-preview ready
- [ ] Ready for real bookings
- [ ] Ready for real payments
- [ ] Ready for public marketing launch

The app is live and healthy. Database persistence, production listing photo uploads, and Resend email configuration are now active. The remaining blockers are Stripe payments, Redis rate limiting, Sentry/analytics monitoring, legal review, protected-route hardening, and real end-to-end booking/payment/email QA.
