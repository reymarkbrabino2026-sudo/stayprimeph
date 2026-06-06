# Security review baseline

## Completed
- Response hardening headers via `proxy.ts`
- Basic server-side rate limiting primitives
- Distributed rate limiting support via Upstash Redis
- Structured server logging primitives and startup instrumentation
- Signed session cookies using `AUTH_SECRET`
- Production database mode requires PostgreSQL + Prisma
- Automated tests for pricing, rate limiting, API handlers, and role-based login

## Reviewed findings
- Booking and listing creation actions already re-check roles.
- Admin listing actions required explicit authorization checks; those are now added.
- JSON file persistence is retained only for local development; production is required to use PostgreSQL via Prisma.
- Temporary blob image URLs are not durable storage.

## Follow-up before public launch
- Move sensitive data access behind a dedicated server-only DAL
- Use provider-backed limits in production and monitor Upstash usage
- Add CSP once external asset domains are finalized
- Add dependency scanning in CI
