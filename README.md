# StayPrimePH

Vacation rental marketplace built with Next.js App Router, TypeScript, Tailwind CSS, and role-based guest / host / admin flows.

## Local development

1. Create your local environment file:

```powershell
Copy-Item .env.development.example .env.local
```

2. Install dependencies:

```powershell
npm install
```

3. Verify the local environment:

```powershell
npm run dev:check
```

4. Start the app:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Environment separation

Next.js loads environment variables by environment:

- development: `.env.local`, then `.env.development`, then `.env`
- production: provider environment variables or `.env.production.local`, then `.env.production`, then `.env`
- test: `.env.test`

Use these tracked templates:

- `.env.development.example` for local development
- `.env.production.example` for production setup
- `.env.test` for test defaults

Current required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma runtime database connection, preferably pooled for hosted/serverless deployments |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migrations |
| `NEXT_PUBLIC_APP_URL` | Public base URL used by the app |
| `AUTH_SECRET` | Signs session cookies; keep server-only |
| `PERSISTENCE_DRIVER` | `json` locally, `prisma` in production |
| `UPSTASH_REDIS_REST_URL` | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting token |
| `SENTRY_DSN` | Server error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error tracking |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | Enables product analytics |
| `PAYMENT_LAUNCH_MODE` | `disabled` for launch without paid bookings, or `stripe` only after live Stripe keys/webhook are ready |
| `RESEND_API_KEY` | Transactional email provider |
| `EMAIL_FROM` | Verified transactional sender |
| `STRIPE_SECRET_KEY` | Server-side Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser-safe Stripe key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for hosted listing photo uploads when Cloudinary is not configured |
| `JSON_STORE_BLOB_READ_WRITE_TOKEN` | Optional Vercel Blob token for JSON persistence; leave blank unless intentionally using Blob as the JSON store |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for Google and Facebook login |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser-safe publishable key for Google and Facebook login |
| `GOOGLE_AUTH_ENABLED` | Set to `enabled` only after the Supabase Google provider uses a current Google OAuth client |

Do not commit real secrets. `.gitignore` excludes real `.env*` files by default.

For provider-backed secret storage and rotation guidance, see `docs/secrets-management.md`.
For Supabase RLS and database exposure guidance, see `docs/supabase-security.md`.
For the current product and launch status, see `docs/project-checklist.md`.
For the shortest production launch path, see `docs/launch-asap.md`.

## External integrations

- Paid bookings are disabled by default. Set `PAYMENT_LAUNCH_MODE=stripe` with live Stripe keys and webhook secret only when real provider payments are approved for launch.
- Listing photos use Cloudinary when configured or Vercel Blob when `PHOTO_BLOB_READ_WRITE_TOKEN`/`BLOB_READ_WRITE_TOKEN` is present. Local filesystem uploads are disabled.
- JSON persistence uses local files by default and uses Vercel Blob only when `JSON_STORE_BLOB_READ_WRITE_TOKEN` is set.
- Resend now sends welcome, verification, password-reset, booking, and listing-review emails.
- Email verification and password reset use expiring one-time tokens.
- Google and Facebook login use Supabase Auth providers. Enable both providers in Supabase and add `/auth/callback` as the redirect path for your app URL.
- Google login is hidden unless `GOOGLE_AUTH_ENABLED=enabled`. If Google returns `Error 401: deleted_client`, create or restore the Google OAuth client, update the Google provider client ID and secret in Supabase Auth, then redeploy with `GOOGLE_AUTH_ENABLED=enabled`.

## Production database

Production now targets managed PostgreSQL through Prisma. Local development can still use the lightweight JSON driver while you build quickly, but production is required to use:

- `DATABASE_URL=postgresql://...`
- `DIRECT_URL=postgresql://...`
- `PERSISTENCE_DRIVER=prisma`

To run PostgreSQL locally:

```powershell
docker compose up -d postgres
npx prisma migrate dev
npm run db:seed
```

To deploy schema changes in production:

```powershell
npx prisma migrate deploy
```

## Production build

Builds do not require production secrets. The build script uses sanitized placeholders for server-only values so database, auth, payment, email, storage, and monitoring secrets are not exposed to build logs or image layers.

```powershell
npm run build:prod
```

Set production secrets only in the runtime environment through Vercel or your hosting provider secret manager. On Node.js hosts, validate runtime configuration and start the app with:

```powershell
npm run start:prod
```

For Vercel, `npm run build:vercel` uses the same sanitized build path. Run database migrations separately from a trusted operator machine or CI job with migration-only access to `DIRECT_URL`.

## Docker deployment

Build:

```powershell
docker build -t stayprimeph .
```

Do not pass production secrets as Docker build args. The image build uses non-secret placeholders and real values are provided only at runtime.

Run:

```powershell
docker run -p 3000:3000 `
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" `
  -e DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" `
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" `
  -e AUTH_SECRET="your-real-provider-managed-secret" `
  -e PERSISTENCE_DRIVER="prisma" `
  -e PAYMENT_LAUNCH_MODE="disabled" `
  -e UPSTASH_REDIS_REST_URL="https://..." `
  -e UPSTASH_REDIS_REST_TOKEN="..." `
  -e SENTRY_DSN="https://..." `
  -e NEXT_PUBLIC_SENTRY_DSN="https://..." `
  -e NEXT_PUBLIC_VERCEL_ANALYTICS="enabled" `
  -e RESEND_API_KEY="re_..." `
  -e EMAIL_FROM="StayPrimePH <noreply@your-domain.com>" `
  -e CLOUDINARY_CLOUD_NAME="..." `
  -e CLOUDINARY_API_KEY="..." `
  -e CLOUDINARY_API_SECRET="..." `
  stayprimeph
```

To intentionally launch real Stripe payments, change `PAYMENT_LAUNCH_MODE` to `stripe` and provide matching live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` runtime secrets.

The Docker image uses Next.js standalone output for a smaller production runtime image.

## Deployment checklist

- Enforce the launch gate in `docs/project-checklist.md`: no real users, public marketing traffic, real bookings, or real payments until every blocker is closed and verification passes
- Set production environment variables in your hosting provider
- Use a managed PostgreSQL database in production
- Store production secrets in the provider vault, not checked-in files
- Configure Upstash, Sentry, Vercel Analytics, and Resend before public launch
- Run `npm run build:prod`
- Run database migrations / seeding as needed
- Create the first admin with `npm run security:bootstrap-admin` only after setting one-time `BOOTSTRAP_ADMIN_*` secrets; see `docs/admin-bootstrap.md`
- Confirm admin / host / guest login paths
- Confirm image storage and payment providers before public launch
- Run the accessibility audit in `docs/accessibility-audit.md`
