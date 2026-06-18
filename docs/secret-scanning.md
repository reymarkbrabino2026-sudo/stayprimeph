# Secret Scanning

StayPrimePH uses two layers of secret protection:

1. GitHub repository/provider controls.
2. CI secret scanning on every push and pull request.

## GitHub Provider Settings

Enable these in GitHub repository settings before production launch:

- Secret scanning: enabled.
- Push protection: enabled.
- Dependabot alerts: enabled.
- Dependabot security updates: enabled.
- Dependency graph: enabled.

If the repository is private and GitHub Advanced Security is required for any setting, the repository owner must enable the required GitHub plan or organization policy.

## CI Enforcement

Security CI runs:

- TruffleHog secret scanning.
- GitHub Dependency Review on pull requests.
- `npm audit --audit-level=high`.
- A tracked `.env` file guard.

## Provider Secret Hygiene

- Store production secrets only in Vercel/provider secret managers.
- Do not commit local `.env` files, provider tokens, webhook secrets, API keys, database URLs, or private keys.
- Rotate any secret that appears in Git history, logs, screenshots, issue comments, support tickets, or chat messages.
- Keep provider alert destinations limited to authorized operators.
