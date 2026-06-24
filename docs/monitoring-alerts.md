# Monitoring and alert plan

This plan defines the alerts required before public launch. It assumes Sentry, Vercel, Resend, Cloudinary or Blob storage, Upstash, and the database provider are configured in their provider dashboards. PayMongo monitoring is required before future online checkout is enabled.

Alert destinations should include the operator inbox and a real-time channel monitored during launch. Keep provider dashboard access limited to admins and never paste secrets into alert descriptions.

## Critical alerts

- App availability: Vercel or an external uptime monitor reports `https://stayprimeph.com/status` failing for 5 minutes.
- Error spike: Sentry issue rate increases sharply or any checkout, auth, upload, admin, or webhook route throws repeatedly.
- Payment failure: manual payment review failures, duplicate/invalid references, or, once PayMongo is implemented, PayMongo webhook delivery failures, checkout session creation errors, dispute events, or elevated failed-payment rates.
- Email failure: Resend delivery failures or bounce spikes for verification, password reset, booking, and support emails.
- Upload failure: Cloudinary upload failures, transformation errors, or missing listing photos after publish.
- Rate-limit pressure: Upstash Redis errors, rejected-command spikes, latency spikes, or unusually high blocked request volume.
- Database pressure: connection exhaustion, slow queries, failed migrations, storage limits, or backup failures.

## Provider Alert Rules

| Provider | Required alert | Suggested threshold |
| --- | --- | --- |
| Sentry | New critical production issue | Immediate |
| Sentry | Error-rate spike on auth, checkout, upload, admin, or webhook routes | 5 events in 5 minutes |
| Vercel | Production deployment failed | Immediate |
| Vercel | Function error-rate or latency spike | 5 minutes sustained |
| Database provider | Connection pool exhaustion or failed backup | Immediate |
| Database provider | Storage or compute near quota | 80 percent threshold |
| Upstash Redis | Command errors, high latency, or quota pressure | 5 minutes sustained |
| Manual payment operations | Repeated invalid references, rejected payment spikes, or payment-review backlog | Immediate |
| PayMongo, before online checkout launch | Webhook delivery failure or checkout/payment failure spike | Immediate |
| Resend | Bounce, delivery failure, or domain/authentication problem | Immediate |
| Cloudinary or Blob storage | Upload/transformation failures or quota pressure | Immediate |

## Sentry Configuration

- Production must set both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.
- Sentry alerts must be scoped to the production environment.
- Alert routing must include checkout, auth, upload, admin, webhook, and global unhandled exceptions.
- Privacy scrubbing must stay enabled before events leave the app.
- Source maps may be uploaded only through provider secrets; do not commit Sentry auth tokens.

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
