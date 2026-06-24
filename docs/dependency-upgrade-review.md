# Dependency Upgrade Review

Last reviewed: 2026-06-23

## Safe updates applied

Patch/minor updates were applied for the current production and tooling lines, including Next 16.2.9, React 19.2.7, Sentry 10.60.0, Supabase JS 2.108.2, Stripe 22.2.3, Vitest 4.1.9, Tailwind 4.3.1, Playwright 1.61.0, and related type/helper packages. `npm audit --audit-level=high` reports 0 vulnerabilities after the update.

## Deferred major and high-risk upgrades

### Prisma 7

Current: `prisma` / `@prisma/client` 6.19.3. Latest reviewed: 7.8.0.

Decision: defer to a dedicated migration branch.

Reasoning: Prisma's official v7 upgrade guide describes breaking changes for upgrades from earlier versions. This app also has migration-sensitive raw SQL, self-healing schema helpers, generated client usage, and production build warnings about Prisma config migration.

Recommended plan:
- Add/validate the Prisma config-file migration separately.
- Upgrade `prisma` and `@prisma/client` together.
- Run `prisma validate`, `prisma generate`, migration deploy dry-runs, unit tests, and a staging migration against a production-like database.

Source: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7

### TypeScript 6

Current: TypeScript 5.9.3. Latest reviewed: 6.0.3.

Decision: defer until framework/tooling compatibility is explicitly tested.

Reasoning: Microsoft's TypeScript 6 announcement describes it as a transition release toward the native TypeScript 7 compiler. It is API-compatible with TypeScript 5.9, but includes breaking changes and deprecations.

Recommended plan:
- Test on a branch with `ignoreDeprecations` only if needed.
- Run `tsc --noEmit`, Next production build, Vitest, and ESLint.
- Review any deprecation warnings before considering TypeScript 7 previews.

Source: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/

### ESLint 10

Current: ESLint 9.39.4. Latest reviewed: 10.5.0.

Decision: defer until lint config and editor integrations are checked.

Reasoning: ESLint's v10 migration guide says the old configuration format is no longer supported. The repo is already on flat config-compatible ESLint 9, and `eslint-config-next@16.2.9` declares compatibility with ESLint `>=9.0.0`, but ESLint 10 should still be validated separately.

Recommended plan:
- Upgrade ESLint on a branch.
- Run `npm run lint` and inspect Next-specific rules.
- Confirm local editor/CI Node versions meet ESLint 10 engine requirements.

Source: https://eslint.org/docs/latest/use/migrate-to-10.0.0

### Node type major (`@types/node` 26)

Current: `@types/node` 20.19.43. Latest reviewed: 26.0.0.

Decision: defer until the runtime target moves from Node 20 to Node 26.

Reasoning: Node.js 26 is released but follows the schedule that enters LTS in October 2026. The current runtime/tooling constraints still support Node 20, and aligning runtime first avoids type/runtime drift.

Recommended plan:
- Keep Node 20 types while production runs Node 20.
- Move runtime, CI, Docker/Vercel settings, and `@types/node` together.
- Re-run Next build and server/runtime smoke tests after the runtime change.

Source: https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule

## Also deferred

- `@supabase/ssr` 0.10.3 -> 0.12.0: deferred because `0.x` minor releases can contain breaking API changes.
- `sharp` 0.34.5 -> 0.35.2: deferred because this is a native image-processing dependency and the available bump is a `0.x` minor; test separately with image upload/build flows.
