# Supabase Security Setup

Use this checklist when connecting StayPrimePH to a Supabase project.

## Dashboard settings

In the Supabase dashboard, open **Project Settings > API** and set the default table behavior like this:

- Turn off **Automatically expose new tables**.
- Turn on **Enable automatic RLS**.
- Turn on **Leaked password protection** in **Authentication > Policies**. Supabase requires the Pro plan or above for this hosted Auth setting; Free projects must upgrade before this Security Advisor warning can be cleared.

This means new database tables start private. A table only becomes accessible through Supabase's public API after we intentionally add grants and row-level security policies.

## Version-controlled RLS migration

The Supabase-specific security migration lives here:

```text
supabase/migrations/0001_stayprimeph_rls.sql
supabase/migrations/0002_close_rls_gaps.sql
supabase/migrations/0003_harden_app_security_functions.sql
supabase/migrations/0004_platform_ledger_rls.sql
supabase/migrations/0005_secure_recent_app_tables.sql
supabase/migrations/0006_allow_security_definer_rls_helpers.sql
supabase/migrations/0007_secure_audit_logs.sql
supabase/migrations/0008_harden_security_advisor_warnings.sql
supabase/migrations/0009_secure_late_app_tables.sql
supabase/migrations/0010_harden_booking_resource_lock_function_search_paths.sql
```

Run the normal Prisma migrations first, then apply the Supabase RLS migration:

```powershell
npx prisma migrate deploy
supabase db push
```

If you do not use the Supabase CLI, open the Supabase SQL Editor and run the contents of:

```text
supabase/migrations/0001_stayprimeph_rls.sql
supabase/migrations/0002_close_rls_gaps.sql
supabase/migrations/0003_harden_app_security_functions.sql
supabase/migrations/0004_platform_ledger_rls.sql
supabase/migrations/0005_secure_recent_app_tables.sql
supabase/migrations/0006_allow_security_definer_rls_helpers.sql
supabase/migrations/0007_secure_audit_logs.sql
supabase/migrations/0008_harden_security_advisor_warnings.sql
supabase/migrations/0009_secure_late_app_tables.sql
supabase/migrations/0010_harden_booking_resource_lock_function_search_paths.sql
```

Run them in that order. The first file creates the shared policy helpers and
protects the main app tables. The second file protects tables that were added
after the initial baseline, including `AccountSettings`, and enables RLS on
Prisma's `_prisma_migrations` metadata table so Supabase Security Advisor stops
flagging it as public. The third file pins the helper function search paths so
the functions cannot accidentally resolve objects from an attacker-controlled
schema. The later files protect the platform ledger, host reports, server-side
sessions, listing booking packages, helper lookup-table access, append-only
audit logs, security-advisor function warnings, booking resource locks, listing
rooms, passkeys, host customer profiles, and booking resource-lock helper
function search paths added by newer Prisma migrations.

## What the policy protects

The migration:

- Enables and forces Row Level Security on every app table.
- Revokes automatic public table access from `anon` and `authenticated`.
- Allows public visitors to read approved listing data only.
- Allows logged-in users to read their own private data only.
- Allows wishlist rows only for the logged-in owner.
- Allows messages only between the sender, receiver, and admins.
- Allows reviews only from users with a paid/confirmed booking.
- Allows reports only from the logged-in reporter.
- Keeps listing, booking, payment, auth, and admin write operations behind the trusted Next.js server.
- Keeps auth tokens inaccessible from browser clients.
- Keeps server-side auth sessions inaccessible from browser clients.
- Keeps booking resource locks inaccessible from browser clients.
- Keeps passkeys inaccessible from browser clients.
- Allows booking packages to be read only when their listing is visible, and hides disabled packages from public visitors.
- Allows listing rooms to be read only when their listing is visible, and hides inactive rooms from public visitors.
- Allows host customer profiles to be read only by the host owner or admins.
- Allows hosts to read only their own host expenses and monthly reports.
- Keeps payments read-only for the guest, host, or admin.
- Keeps admin logs visible only to admins.
- Keeps append-only audit logs visible only to admins.

## Important production note

The app's trusted Next.js server still uses Prisma through `DATABASE_URL`, and Prisma migrations use `DIRECT_URL`. Both connections should use private database credentials stored only in Vercel environment variables.

Browser code must never receive:

- `DATABASE_URL`
- `DIRECT_URL`
- Supabase service role key
- Stripe secret key
- Auth/session secrets

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are safe for browser use.

## User ID compatibility

The RLS helper accepts both of these user ID formats:

- The raw Supabase Auth user id.
- The current app format: `supabase-{auth-user-id}`.

That keeps the policies compatible with the existing Google/Facebook login flow.

## Safer workflow for future database changes

When adding a new table, put the schema and security together in version control:

```sql
CREATE TABLE "Example" (...);
ALTER TABLE "Example" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Example" FORCE ROW LEVEL SECURITY;
GRANT SELECT ON "Example" TO authenticated;
CREATE POLICY example_owner_read ON "Example" ...;
```

Do not create production tables only by clicking around in the Supabase dashboard. If the schema and security rules live in GitHub, they can be reviewed, copied to staging, audited, and recovered later.
