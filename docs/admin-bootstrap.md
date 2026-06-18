# One-Time Admin Bootstrap

Use this only when a production or staging database has no active password-based admin.

The bootstrap runs as a local/operator CLI command against the configured `DATABASE_URL`. It is not exposed as a web route.

## Required Environment Variables

- `BOOTSTRAP_ADMIN_EMAIL`: real operator-controlled admin email. Do not use demo/default addresses.
- `BOOTSTRAP_ADMIN_PASSWORD`: temporary first admin password. Use a unique 16+ character password with upper/lowercase letters, a number, and a symbol.
- `BOOTSTRAP_ADMIN_CONFIRM`: must be exactly `bootstrap-admin-once`.
- `BOOTSTRAP_ADMIN_NAME`: optional display name.

## Dry Run

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin-person@your-domain.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="Use-A-Unique-Long-Password#2026"
$env:BOOTSTRAP_ADMIN_CONFIRM="bootstrap-admin-once"
$env:DRY_RUN="1"
npm run security:bootstrap-admin
```

## Apply

```powershell
$env:DRY_RUN=""
npm run security:bootstrap-admin
```

After it succeeds:

- Remove `BOOTSTRAP_ADMIN_*` values from the shell and deployment secret manager.
- Log in once and change the password through the normal account flow when available.
- Do not keep shared admin credentials; create named admin accounts for operators.

The script refuses to run if an active password-based admin already exists.
