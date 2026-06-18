# Backup and recovery plan

This is the launch baseline for protecting StayPrimePH data. It must be validated against the actual production provider before launch.

## Systems to protect

- PostgreSQL database: users, listings, bookings, payments, messages, reviews, reports, admin logs.
- Cloudinary assets: listing photos and generated transformations.
- Environment secrets: provider vault values, not local `.env` files.
- Deployment artifacts: source code, migrations, and release tags.

## Backup policy

- Database: automated daily backups with point-in-time recovery enabled when the provider supports it.
- Database backup encryption: production backups must be encrypted at rest with provider-managed encryption or a customer-managed key. Exported database dumps must be encrypted before leaving the provider boundary and must not be stored unencrypted on laptops, shared drives, CI artifacts, or repo folders.
- Database backup access: restrict backup and restore access to the smallest possible operator/admin group. App runtime credentials, Prisma runtime credentials, Vercel build jobs, and browser/API clients must not have permission to list, download, delete, or restore production backups.
- Media: Cloudinary account exports or provider-level asset backup before major destructive migrations.
- Media backup encryption and access: media exports must inherit provider encryption at rest or be encrypted before transfer. Restrict export/download permissions to admins responsible for recovery, and do not make backup buckets/folders public or listable.
- Secrets: store in the deployment provider and document rotation ownership; never back up secrets into the repo, database dumps, screenshots, tickets, or CI artifacts.
- Releases: tag production releases so schema and application code can be paired during recovery.

## Access-control requirements

Before production launch, confirm these controls in the actual database/storage provider dashboards:

- Backup encryption at rest is enabled for PostgreSQL snapshots, PITR/WAL archives, and media exports.
- Backup downloads require MFA-protected admin accounts.
- Backup access is logged and alerts are enabled for backup export, restore, deletion, or retention-policy changes.
- Only named owners can restore production backups; day-to-day application roles cannot.
- Production backups are not copied into public buckets, shared links, local project directories, or long-lived CI artifacts.
- Retention is limited to the approved legal/privacy window, and expired backups are automatically purged where the provider supports it.
- Restores are performed into staging or an isolated recovery database first; production restore requires an incident/release approval record.

## Restore access model

Backup restore access is privileged production access. Keep it separate from normal application administration.

- Backup owner: one named technical owner is accountable for provider backup settings, restore drills, and access reviews.
- Backup approver: one named business or incident owner approves production restores and emergency backup exports.
- Restore operator: one named engineer performs the restore after approval. Use a separate MFA-protected provider admin account, not shared credentials.
- Observer/reviewer: one named reviewer verifies the restored environment, confirms the source backup timestamp, and checks that no unauthorized backup export occurred.

Day-to-day app roles must not receive backup permissions:

- Prisma runtime database user: no backup list, download, delete, or restore permissions.
- Prisma migration user: schema migration only; no backup administration unless temporarily approved for an incident.
- Vercel runtime/build roles: no direct backup export or restore permissions.
- Supabase `anon`, `authenticated`, and service role keys: no human backup workflow access.

## Restore approval process

Use this process for any restore from production backup data:

1. Open an incident, release, or recovery record with the reason for restore, requested backup timestamp, target environment, requester, approver, and operator.
2. Confirm the target is staging or an isolated recovery database by default. Production restore requires explicit approval from the backup approver.
3. Grant temporary provider access to the restore operator only if their existing role does not already include restore permission.
4. Restore the selected backup and record the provider backup ID, source timestamp, restore target, start time, finish time, and operator.
5. Run the recovery drill checks before connecting the restored database to any public app environment.
6. Revoke any temporary provider access immediately after the restore and record the revocation time.
7. Review provider audit logs for backup export, restore, deletion, and permission changes during the restore window.

## Access review and rotation

Review backup access at least monthly and after every production incident, personnel change, vendor change, or restore drill.

- Remove backup access for anyone who no longer needs restore responsibility.
- Confirm all backup-capable accounts have MFA enabled and are individually assigned, not shared.
- Rotate provider admin passwords, recovery codes, and API tokens after suspected exposure or unauthorized backup access.
- Rotate database credentials if a database dump is exported outside the provider boundary, even if the export was encrypted.
- Rotate encryption keys according to provider capability and business policy. If customer-managed keys are used, document key owner, rotation cadence, last rotation date, and next rotation date.
- Rotate `DATABASE_URL`, `DIRECT_URL`, Supabase service role keys, Cloudinary credentials, and Vercel Blob tokens if a restored environment exposes secrets to a broader audience than production.
- Confirm old credentials are disabled after rotation and that Vercel/provider secret stores contain only current values.

Keep an access-review log with:

- Review date.
- Reviewer.
- Provider/project reviewed.
- Backup-capable users and roles.
- Changes made.
- Follow-up owner and due date.

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
5. Confirm temporary restore access was revoked and provider audit logs show only expected backup activity.
6. Record the duration, backup ID, source timestamp, operator, reviewer, issues, access changes, rotations performed, and follow-up actions.
