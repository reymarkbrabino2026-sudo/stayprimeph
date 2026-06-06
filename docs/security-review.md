# Final security review checklist

Run this checklist before public launch and again before connecting live payments.

## Authentication and authorization

- Confirm guest, host, and admin pages enforce role checks server-side.
- Confirm server actions and route handlers validate the current user and role.
- Confirm password reset and email verification tokens are single-use and expire.
- Confirm cookies are signed, HTTP-only where appropriate, and protected in production.

## Data protection

- Confirm secrets are only in provider vaults and never committed.
- Confirm payment card details are never stored locally.
- Confirm admin pages do not expose password hashes, tokens, or internal secrets.
- Confirm user-generated content is escaped and never rendered as unsafe HTML.

## Abuse resistance

- Confirm Upstash rate limiting is enabled in the deployed environment.
- Confirm auth, upload, checkout, and message endpoints have abuse limits.
- Confirm file uploads validate type, size, and storage provider errors.
- Confirm reports and disputes can be reviewed by admins.

## Launch review

- Run `npm.cmd run lint`.
- Run `npm.cmd run test`.
- Run `npm.cmd run build`.
- Run `npm.cmd run test:e2e`.
- Run a manual penetration review on auth, booking, upload, admin approval, and payment flows.
