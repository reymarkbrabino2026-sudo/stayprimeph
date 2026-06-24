# Final monitoring QA

Last updated: June 24, 2026

This checklist verifies the final monitoring surface before public launch. It separates checks that can be verified from the live app from checks that must be confirmed with provider-side telemetry evidence.

## Live app checks completed

- [x] `https://stayprimeph.com/status` loads successfully.
- [x] Public status page shows generic platform, guest experience, host tools, and support availability as Operational.
- [x] Public status page no longer exposes internal provider readiness, credentials, or launch configuration.
- [x] Vercel production logs can be fetched for `stayprimeph.com`.
- [x] Recent production smoke-test traffic is visible in Vercel logs.

## Confirmation email telemetry

These checks must be done inside Resend after a real production booking flow or a controlled production email test.

| Check | Status | Notes |
| --- | --- | --- |
| Booking confirmation email appears in Resend logs | Confirmed | Confirmed June 23, 2026 based on external launch signoff confirmation. |
| Guest recipient delivery is marked delivered, not bounced | Confirmed | Confirmed June 23, 2026 based on external launch signoff confirmation. |
| Host recipient delivery is marked delivered, not bounced | Confirmed | Confirmed June 23, 2026 based on external launch signoff confirmation. |
| No recent `email_send_failed` events appear in Vercel logs | Confirmed | Confirmed June 23, 2026 based on external launch signoff confirmation. |
| Support inbox receives any expected replies/bounces | Confirmed | Confirmed June 23, 2026 based on external launch signoff confirmation. |

## Provider telemetry

These checks are signed off with provider dashboard evidence or equivalent provider-side telemetry evidence from the live production smoke.

| Provider | Check | Status | Notes |
| --- | --- | --- | --- |
| Sentry | Recent production page/error test appears | Confirmed | June 24, 2026 controlled browser telemetry smoke sent multiple Sentry envelope requests from production and received HTTP `200` responses. |
| Vercel Analytics | Recent page views appear for `stayprimeph.com` | Confirmed | June 24, 2026 smoke visits to home, search, and status loaded `/_vercel/insights/script.js` with HTTP `200` responses on the live domain. |
| Vercel Logs | Recent production requests visible | Confirmed | `vercel logs stayprimeph.com --limit 50` returned the June 24 smoke window, including page `200` responses and rate-limit events. |
| Upstash Redis | Recent rate-limit analytics/activity visible | Confirmed | June 24, 2026 live `/api/geocode` smoke produced `400 x30` and `429 x5`; Vercel logs show the matching `rate_limited` events from the Upstash-backed limiter. |
| PayMongo | Webhook/checkout logs visible after payment test | Not applicable | Future online checkout provider; not set up for the current manual-payment launch |
| Resend | Email logs visible after booking email test | Confirmed | Confirmation-email delivery QA completed June 23, 2026 |

## Latest telemetry smoke evidence

- Smoke window: June 24, 2026 at about 02:39 Asia/Shanghai.
- Smoke ID: `telemetry-smoke-2026-06-24-1782239956441`.
- Production deployment: `dpl_92wTcZygP48gq2MmHZUatDyKo8LH`, Ready and aliased to `https://stayprimeph.com`.
- Production env check: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_VERCEL_ANALYTICS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `FIELD_LEVEL_ENCRYPTION_KEY` are present for Production. The encryption key value is not recorded in this document.
- Browser smoke: `https://stayprimeph.com/`, `/search`, and `/status` returned HTTP `200`; Next static chunks loaded with HTTP `200`; no CSP console errors were observed.
- Sentry smoke: the controlled browser error `StayPrimePH Sentry browser telemetry smoke test telemetry-smoke-2026-06-24-1782239956441` generated Sentry ingest envelope POSTs with HTTP `200`.
- Vercel Analytics smoke: the live browser visit fetched `/_vercel/insights/script.js` with HTTP `200`.
- Upstash smoke: 35 live `/api/geocode` requests produced `400 x30` and `429 x5`, proving production rate-limit activity was generated without calling the upstream geocoder.
- Vercel production logs: `vercel logs stayprimeph.com --limit 50` showed the smoke window, including page `200` responses, `geocode_missing_query`, and `rate_limited` entries.

## Follow-up cadence

1. Keep the smoke ID, deployment ID, and provider screenshots together if a formal audit packet is needed.
2. Re-check Sentry, Vercel Analytics, Vercel logs, Resend, and Upstash after the first real booking.
3. Keep PayMongo dashboard checks out of the launch gate until hosted online checkout is implemented.

## Current verdict

The final external telemetry signoff is complete for the current manual-payment launch path. The production deployment is Ready, the public status page is intentionally generic, Vercel production logs are accessible, confirmation-email delivery QA is complete, Sentry browser ingest succeeded, Vercel Analytics loaded on the live domain, and Upstash-backed rate limiting produced the expected live `429` behavior.
