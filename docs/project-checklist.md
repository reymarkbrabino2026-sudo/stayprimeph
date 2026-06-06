# StayPrimePH launch checklist

This checklist separates **code-level readiness** from **launch readiness**.

- **Done** means the feature or integration path is implemented in the codebase.
- **Launch-ready** means the feature is implemented, configured with real online provider credentials, deployed, and tested in the hosted environment.

## Product foundations

- [x] Guest, host, and admin roles
- [x] Responsive public homepage
- [x] Search, filters, and listing cards
- [x] Listing detail pages with gallery, reviews, map, and booking card
- [x] Guest trips, wishlist, messages, reviews, and profile pages
- [x] Host listing wizard and management pages
- [x] Admin dashboards for users, hosts, listings, bookings, payments, reports, reviews, disputes, and settings
- [x] Top-level Support, Hosting, Company, Legal, Trust and Safety, an1d Status screens

## Code implemented

- [x] Real auth/session flow
- [x] Password reset / email verification
- [x] Real host-created listings feed into public pages
- [x] Booking creation and price calculations
- [x] Admin listing approval flow
- [x] Redis-backed distributed rate limiting hooks
- [x] Sentry error tracking integration hooks
- [x] Analytics integration hook
- [x] Email notification integration hooks
- [x] Payment gateway integration path
- [x] Real image storage path with Cloudinary support
- [x] PostgreSQL + Prisma production path
- [x] Seed data and local JSON development path

## Quality, accessibility, and safeguards

- [x] Unit tests
- [x] Integration tests
- [x] End-to-end tests
- [x] Automated accessibility audit
- [x] Logging / observability hooks
- [x] Safe-area spacing and reduced-motion support
- [x] Responsive regression coverage
- [x] Global error fallback
- [x] Friendly 404 page

## SEO and deployment baseline

- [x] Metadata baseline
- [x] Robots file
- [x] Sitemap
- [x] PWA manifest baseline for future app packaging
- [x] Security headers baseline
- [x] Environment templates for development, test, and production
- [x] Docker deployment path
- [x] Secrets management guidance

## Provider/account setup still needed

- [ ] Real hosted PostgreSQL database configured
- [ ] Real Cloudinary account configured
- [ ] Real Stripe test account + webhook configured
- [ ] Real Resend sender/domain configured
- [ ] Real Upstash Redis configured
- [ ] Real Sentry project configured
- [ ] Real analytics project verified in deployment
- [ ] Real deployed test environment smoke-tested
- [ ] Production domain configured

## Final human review still needed

- [x] Full SEO setup beyond baseline metadata, sitemap, and robots
- [x] Legal page templates: terms, privacy policy, cancellation policy, safety policy
- [x] Backup and recovery plan
- [x] Monitoring alerts plan
- [x] Security review checklist
- [x] App-store packaging prep for future iOS / Android wrapper
- [ ] Legal copy reviewed by a qualified legal/privacy professional
- [ ] Monitoring alerts configured in real providers
- [ ] Final penetration/security review completed
- [ ] Manual accessibility audit with keyboard, screen reader, zoom, and reduced motion
- [ ] Manual QA on real iPhone, Android, tablet, and desktop devices
- [ ] Real sandbox payment test
- [ ] Real email delivery test
- [ ] Real photo upload test in deployed environment
- [ ] Load/performance pass with production data volume
- [ ] Manual launch QA checklist completed (`docs/manual-launch-qa.md`)

## Next recommended order

Use `docs/launch-asap.md` as the active go-live runbook.

1. Configure online test services: hosted PostgreSQL, Cloudinary, Stripe test mode, Resend, Upstash, Sentry, and analytics.
2. Deploy a test environment and run a real end-to-end smoke test.
3. Test payment, email, and photo upload in the deployed environment.
4. Complete manual device, accessibility, SEO, legal, backup, monitoring, and security reviews.
5. Only then prepare the live domain and production credentials.
