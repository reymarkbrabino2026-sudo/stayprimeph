# Monitoring and alert plan

This plan defines the alerts needed before public launch. It assumes Sentry, analytics, provider logs, Stripe, Resend, Cloudinary, Upstash, and the hosting provider are configured.

## Critical alerts

- App availability: homepage or health check fails for 5 minutes.
- Error spike: Sentry issue rate increases sharply or any checkout/auth route throws repeatedly.
- Payment failure: Stripe webhook failures or checkout session creation errors.
- Email failure: Resend delivery failures for verification, password reset, or booking emails.
- Upload failure: Cloudinary upload failures or missing listing photos after publish.
- Rate-limit pressure: Upstash errors or unusually high blocked request volume.
- Database pressure: connection exhaustion, slow queries, failed migrations, or storage limits.

## Operational dashboards

- Product: searches, listing views, signup conversion, booking starts, booking completions.
- Host: listing drafts, pending approvals, published listings, rejected listings.
- Admin: reports, disputes, approval queue age, payment issues.
- Technical: web vitals, request errors, API latency, deployment health.

## Incident rhythm

1. Triage severity and user impact.
2. Pause risky flows if needed, such as payments or publishing.
3. Fix or roll back.
4. Verify recovery using the smoke test checklist.
5. Write a short incident note with root cause and prevention.
