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

## Required production config

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public production URL; this value is exposed to the browser |
| `PERSISTENCE_DRIVER` | Must be `prisma` in production |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser-visible Sentry DSN |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | Set to `enabled` in production |
| `EMAIL_FROM` | Verified sender identity for transactional email |

## Recommended workflow

1. Store secrets in the platform vault:
   - Vercel: Project Settings → Environment Variables
   - Render / Railway / Fly.io: service secret settings
   - GitHub Actions: repository or environment secrets
2. Give production, preview, and development environments separate values.
3. Rotate `AUTH_SECRET` and database credentials on a schedule and after any suspected leak.
4. Run `npm run prod:check` before each deployment.
5. Never paste real values into screenshots, issues, chat, or committed files.

## Generate a secret

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
