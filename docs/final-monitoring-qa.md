# Final monitoring QA

Last updated: June 7, 2026

This checklist verifies the final monitoring surface before public launch. It separates checks that can be verified from the live app from checks that must be confirmed inside provider dashboards.

## Live app checks completed

- [x] `https://stayprimeph.com/status` loads successfully.
- [x] Status page shows Web app as Operational.
- [x] Status page shows Authentication as Operational.
- [x] Status page shows Photo uploads as Operational.
- [x] Status page shows Payments as Operational.
- [x] Status page shows Email as Operational.
- [x] Status page shows Rate limiting as Operational.
- [x] Status page shows Monitoring as Operational.
- [x] Vercel production logs can be fetched for `stayprimeph.com`.

## Confirmation email telemetry

These checks must be done inside Resend after a real production booking flow or a controlled production email test.

| Check | Status | Notes |
| --- | --- | --- |
| Booking confirmation email appears in Resend logs | Not confirmed | Check for subject containing `Booking received for` |
| Guest recipient delivery is marked delivered, not bounced | Not confirmed | Confirm recipient address and delivery status |
| Host recipient delivery is marked delivered, not bounced | Not confirmed | Confirm recipient address and delivery status |
| No recent `email_send_failed` events appear in Vercel logs | Not confirmed | Search Vercel logs after the email test |
| Support inbox receives any expected replies/bounces | Not confirmed | Check `support@stayprimeph.com` |

## Provider telemetry

These checks must be done in each provider dashboard.

| Provider | Check | Status | Notes |
| --- | --- | --- | --- |
| Sentry | Recent production page/error test appears | Not confirmed | Confirm latest production deployment and no unhandled critical issue |
| Vercel Analytics | Recent page views appear for `stayprimeph.com` | Not confirmed | Visit home/search/status, then confirm analytics activity |
| Vercel Logs | Recent production requests visible | Confirmed | `vercel logs stayprimeph.com --limit 20` returned recent legal-page requests |
| Upstash Redis | Recent rate-limit analytics/activity visible | Not confirmed | Check database analytics for `stayprimeph` prefix |
| Stripe | Webhook/checkout logs visible after payment test | Not confirmed | Needed when switching to live payments |
| Resend | Email logs visible after booking email test | Not confirmed | Needed for final confirmation email signoff |

## How to complete the remaining checks

1. Open `https://stayprimeph.com` and visit a few public pages.
2. Open Vercel Analytics and confirm the page views appear.
3. Open Sentry and confirm no new critical production issue appears during the smoke test.
4. Open Upstash and confirm rate-limit analytics/activity exists for the `stayprimeph` prefix.
5. Trigger a controlled production booking email flow.
6. Open Resend and confirm guest and host booking emails are delivered.
7. Search Vercel logs for `email_sent`, `email_send_failed`, checkout, webhook, and rate-limit events after the test window.

## Current verdict

The app-side monitoring configuration is active, and Vercel production logs are accessible. Final provider-dashboard telemetry is not fully signed off until Resend delivery, Sentry activity, Vercel Analytics activity, and Upstash rate-limit telemetry are confirmed in their dashboards.
