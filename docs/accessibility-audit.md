# Accessibility audit

Automated checks currently cover:

- `/`
- `/login`
- `/register`
- `/search`
- `/become-a-host/setup`

Run:

```powershell
npm run test:e2e
```

The automated gate fails on serious or critical axe findings and also checks responsive overflow at mobile, tablet, and desktop widths.

Before launch, still do a manual pass for:

- keyboard-only navigation
- screen-reader behavior
- 200% and 400% zoom
- reduced-motion preference
- real checkout and real upload flows with provider accounts
