# Testing and demo data

## Local checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Vitest covers authentication, validation, ownership checks, runtime routing/CORS, logging privacy/failures, and history queries. These tests mock Supabase; they do not establish live database behavior. Use `npm run test:watch` during development.

## Live integration tests

Use a dedicated test Supabase project with **all migrations applied** and its credentials in `.env.local`. Stop other Next.js servers for this checkout first: Playwright rebuilds the shared `.next` directory.

```bash
npx playwright install chromium
npm run test:e2e
```

The suite starts a production server on port 3100 and tests:

- Project/endpoint CRUD, validation, JSON `null`, clipboard actions, and mobile navigation.
- Authenticated cross-user isolation and database constraints.
- Anonymous mock responses, exact routing, methods, statuses, browser CORS, and configuration updates.
- Request logging, privacy, counts, filtering, pagination, refresh, detail views, and deletion cascades.

Tests create preconfirmed `mockforge-e2e-…@example.invalid` accounts. The server key manages fixture accounts; data operations use their authenticated sessions. Cleanup deletes only verified fixture accounts and cascades their test data. Never point the suite at data you cannot afford to lose.

Traces and videos are disabled to avoid capturing authentication material. Screenshots are written to gitignored `test-results/`. If a run is forcibly interrupted, inspect any leftover test accounts before removing them manually; do not bulk-delete users.

## SQL RLS checks

[supabase/tests/rls.sql](../supabase/tests/rls.sql) checks ownership, cross-user mutations, log-write restrictions, anonymous access, table privileges, and cascade behavior with synthetic users.

Run the whole script as `postgres` in a disposable Supabase project's SQL Editor, or against a local instance:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

The script wraps changes in a transaction and rolls them back. If an assertion fails in an interactive SQL session, execute `ROLLBACK;` before continuing.

## Demo data

After applying migrations and creating a test Auth user, run [supabase/seed.sql](../supabase/seed.sql) in that test project's SQL Editor. It attaches a demo project and endpoint to the oldest Auth user, skips when no user exists or the slug is taken, and never overwrites existing configuration.

Do not use `supabase db reset` to seed an existing account: a reset deletes Auth users and application data. For a local Supabase instance, the seed can also be applied with `psql`:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

## Release smoke checklist

1. Sign up, confirm email, log in, and sign out. Verify private routes redirect signed-out visitors.
2. Create a project and endpoint. Reject duplicate routes, malformed JSON, invalid paths/statuses, and oversized payloads.
3. Call the generated URL from another browser origin. Verify the configured JSON/status, OPTIONS preflight, 404/405 behavior, and immediate response changes after edits.
4. Inspect the recorded request. Confirm secrets in test headers, bodies, and unsupported query parameters are absent. Use fake secrets only.
5. Generate more than 12 calls. Check counts, filtering, Next/Previous, refresh, query copying, and mobile navigation.
6. Verify a second account cannot access the first account's configuration or history, or write logs directly.
7. Delete a disposable endpoint/project and verify its related records disappear. Do not use important data for deletion checks.
8. Repeat auth, CORS, and logging checks on the deployed hostname. Review environment variables, Auth redirects, storage retention, and abuse controls.

## Dependency maintenance

```bash
npm audit --omit=dev
npm audit
```

Review production and development findings separately. Avoid forced dependency downgrades; keep Next.js and its ESLint configuration compatible, and rerun checks after upgrades.
