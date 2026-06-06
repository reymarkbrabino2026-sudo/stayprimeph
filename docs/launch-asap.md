# StayPrimePH launch ASAP runbook

This app is code-ready when `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run test:e2e`, and `npm.cmd run build` pass. Public launch still needs real provider accounts, production secrets, and a hosted smoke test.

## 1. Create production providers

- PostgreSQL: create a managed Postgres database with TLS. Use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`.
- Cloudinary: create a cloud, API key, and API secret for listing photos.
- Stripe: use test mode first, create a webhook endpoint at `https://YOUR_DOMAIN/api/payments/webhook`, and subscribe it to checkout/payment events used by Checkout.
- Resend: verify the sender domain and set `EMAIL_FROM` to that verified sender.
- Upstash Redis: create a REST Redis database for distributed rate limiting.
- Sentry: create a Next.js project and copy both server and public DSNs.
- Analytics: set `NEXT_PUBLIC_VERCEL_ANALYTICS=enabled` when deploying on Vercel.

## 2. Set production environment variables

Use the hosting provider's secret store. Do not put real values into tracked files.

Required:

```text
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_APP_URL
AUTH_SECRET
PERSISTENCE_DRIVER=prisma
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_VERCEL_ANALYTICS=enabled
RESEND_API_KEY
EMAIL_FROM
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Generate `AUTH_SECRET` locally:

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 3. Deploy database schema

Run against the production database before the first hosted smoke test. Prisma uses `DIRECT_URL` for migrations and `DATABASE_URL` for app runtime queries:

```powershell
npm.cmd run db:migrate:prod
```

Seed only if you intentionally want demo data in that environment:

```powershell
npm.cmd run db:seed
```

## 4. Verify before pointing the live domain

From this repo:

```powershell
npm.cmd run prod:check
npm.cmd run lint
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```

On the deployed preview URL, manually verify:

- Register, verify email, log in, log out, reset password.
- Search listings, open listing details, and start checkout.
- Complete a Stripe sandbox payment and confirm the booking shows as paid.
- Create a host listing, upload photos, and approve it in admin.
- Confirm Resend emails arrive and Cloudinary images render.
- Check Sentry, analytics, provider logs, and Upstash rate-limit telemetry.

## 5. Go live

Point the production domain at the deployment, set `NEXT_PUBLIC_APP_URL` to the final `https://` domain, redeploy, and rerun the hosted smoke test. Keep Stripe in test mode until the entire hosted flow is clean, then switch Stripe keys and webhook secret to live mode.
