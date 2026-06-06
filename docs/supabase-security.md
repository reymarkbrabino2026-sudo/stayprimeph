# Supabase Security Setup

Use this checklist when connecting StayPrimePH to a Supabase project.

## Dashboard settings

In the Supabase dashboard, open **Project Settings > API** and set the default table behavior like this:

- Turn off **Automatically expose new tables**.
- Turn on **Enable automatic RLS**.

This means new database tables start private. A table only becomes accessible through Supabase's public API after we intentionally add grants and row-level security policies.

## Version-controlled RLS migration

The Supabase-specific security migration lives here:

```text
supabase/migrations/0001_stayprimeph_rls.sql
```

Run the normal Prisma migrations first, then apply the Supabase RLS migration:

```powershell
npx prisma migrate deploy
supabase db push
```

If you do not use the Supabase CLI, open the Supabase SQL Editor and run the contents of:

```text
supabase/migrations/0001_stayprimeph_rls.sql
```

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
- Keeps payments read-only for the guest, host, or admin.
- Keeps admin logs visible only to admins.

## Important production note

The app's trusted Next.js server still uses Prisma through `DATABASE_URL`. That server connection should use a private database credential stored only in Vercel environment variables.

Browser code must never receive:

- `DATABASE_URL`
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
