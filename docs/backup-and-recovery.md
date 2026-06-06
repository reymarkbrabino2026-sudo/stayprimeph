# Backup and recovery plan

This is the launch baseline for protecting StayPrimePH data. It must be validated against the actual production provider before launch.

## Systems to protect

- PostgreSQL database: users, listings, bookings, payments, messages, reviews, reports, admin logs.
- Cloudinary assets: listing photos and generated transformations.
- Environment secrets: provider vault values, not local `.env` files.
- Deployment artifacts: source code, migrations, and release tags.

## Backup policy

- Database: automated daily backups with point-in-time recovery enabled when the provider supports it.
- Media: Cloudinary account exports or provider-level asset backup before major destructive migrations.
- Secrets: store in the deployment provider and document rotation ownership; never back up secrets into the repo.
- Releases: tag production releases so schema and application code can be paired during recovery.

## Recovery targets

- Restore point objective: recover to a backup from the last 24 hours for normal incidents.
- Restore time objective: restore core browsing and booking pages within 4 hours for a severe incident.
- Critical path: restore database first, confirm migrations, verify auth, verify listings, verify bookings, then verify payments and messaging.

## Recovery drill

Run this before launch and after major schema changes:

1. Restore the latest backup into a staging database.
2. Set staging `DATABASE_URL` to the restored database.
3. Run `npm.cmd run build`.
4. Smoke test login, search, listing details, booking checkout, host listings, and admin approvals.
5. Record the duration, issues, and follow-up actions.
