# Secrets management

Production secrets should live in your hosting provider's encrypted secret store, never in tracked files.

## Required production secrets

| Secret | Notes |
| --- | --- |
| `DATABASE_URL` | Managed PostgreSQL runtime connection string with TLS enabled, preferably pooled |
| `DIRECT_URL` | Direct managed PostgreSQL connection string used only for Prisma migrations |
| `AUTH_SECRET` | 32+ random characters used to sign session cookies |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `SENTRY_DSN` | Server-side Sentry DSN |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `STRIPE_SECRET_KEY` | Stripe server key. Use `sk_test_` for testing and `sk_live_` or a live restricted key for real payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for the matching test or live webhook endpoint |

## Required production config

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public production URL; this value is exposed to the browser |
| `PERSISTENCE_DRIVER` | Must be `prisma` in production |
| `PAYMENT_LAUNCH_MODE` | Use `disabled` until paid bookings are intentionally launched. Use `stripe` only with live Stripe keys and a live webhook secret |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser-visible Sentry DSN |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | Set to `enabled` in production |
| `EMAIL_FROM` | Verified sender identity for transactional email |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key. Use `pk_test_` for testing and `pk_live_` for real payments |

## Recommended workflow

1. Store secrets in the platform vault:
   - Vercel: Project Settings → Environment Variables
   - Render / Railway / Fly.io: service secret settings
   - GitHub Actions: repository or environment secrets
2. Give production, preview, and development environments separate values.
3. Rotate `AUTH_SECRET` and database credentials on a schedule and after any suspected leak.
4. Do not pass secrets as Docker build args, Vercel build-time variables, or checked-in files. Build commands use sanitized placeholders.
5. Run `npm run prod:check` in the runtime environment before launch or as a release smoke check.
6. Run database migrations separately from app builds using a trusted operator machine or CI job with migration-only access to `DIRECT_URL`.
7. Never paste real values into screenshots, issues, chat, or committed files.
8. Keep `PAYMENT_LAUNCH_MODE=disabled` unless production is approved to collect real money.
9. For Stripe live mode, set `PAYMENT_LAUNCH_MODE=stripe` and keep the publishable, server, and webhook keys from the same Stripe mode. Do not mix `pk_live_` with `sk_test_`, or a live API key with a test webhook secret.

## Storage exposure controls

- Keep Vercel Blob read-write tokens server-only. The app must not import or expose Blob list APIs from public routes.
- Keep listing photo uploads on `/api/uploads/listing-photo`; direct browser-to-Blob and direct browser-to-Cloudinary uploads are disabled.
- In Cloudinary, keep resource/list delivery disabled and do not enable public folder/listing endpoints.
- Public listing photo URLs may be viewable by URL, but storage buckets/folders must not be enumerable.

## Generate a secret

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
