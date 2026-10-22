# MockForge

MockForge is a developer-focused web application for creating persistent mock REST API endpoints without writing backend code. Users manage projects and JSON responses in a protected dashboard, while generated mock URLs remain publicly callable by frontend applications.

Phase 1 establishes the production foundation: Next.js, the visual system, Supabase SSR authentication, the protected dashboard shell, the PostgreSQL schema, and row-level security. Project and endpoint management begins in Phase 2.

## Architecture

```mermaid
flowchart LR
  Browser[Browser] --> Next[Next.js App Router]
  Next --> Auth[Supabase Auth]
  Next --> UserClient[Authenticated Supabase client]
  UserClient --> RLS[PostgreSQL + RLS]
  PublicClient[Frontend application] -. Phase 3 .-> Runtime[Public mock route handler]
  Runtime -. server-only service role .-> RLS
```

The dashboard uses cookie-based Supabase sessions and verifies the current user on the server before rendering private content or querying workspace data. Normal data access uses the authenticated client and remains constrained by PostgreSQL RLS. In Phase 3, the public runtime will use the service role only inside server code to look up active endpoint responses and write minimal request logs.

`proxy.ts` refreshes sessions on dashboard and authentication pages and preserves Supabase's refreshed cookies and cache headers. Authenticated responses are not publicly cached. Public pages work without Supabase configuration; auth pages show a setup notice and disable submission until configuration is present. Server and administrative clients use `server-only` guards so they cannot be imported into browser components.

## Stack

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- Tailwind CSS 4
- Supabase PostgreSQL and Auth
- `@supabase/ssr` for cookie-based sessions
- Zod for server-side input validation
- ESLint for static checks and Vitest for foundation tests

## Local setup

1. Use Node.js 22.12+ (Node.js 24 LTS recommended) and install dependencies:

   ```bash
   npm ci
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com), then copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the values from **Supabase Dashboard → Project Settings → API**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Only the two public Supabase values and the site origin are needed for Phase 1. The service-role key is reserved for Phase 3; it can remain unset for now. Never rename it with a `NEXT_PUBLIC_` prefix or expose it to browser code. Use the API key labelled **Publishable** (or the legacy `anon` key) for the public client, never a secret or service-role key.

   `NEXT_PUBLIC_SITE_URL` must be an HTTP(S) origin without a path. Set it explicitly in production; sign-up does not silently fall back to localhost there. Restart the dev server after editing environment variables, and rebuild after changing any `NEXT_PUBLIC_` value in production.

4. Apply both database migrations. For a fresh CLI checkout, initialize the CLI configuration once, then link to the intended Supabase project:

   ```bash
   npx supabase init
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

   Alternatively, run these files in the Supabase SQL Editor **in order, once each**:

   - `supabase/migrations/20261022190000_initial_schema.sql`
   - `supabase/migrations/20261023090000_foundation_hardening.sql`

   If the initial migration was already applied, run only the hardening migration. It adds explicit role grants and tighter constraints without recreating tables. Existing endpoints with a 1xx status or JSON larger than 64 KiB must be corrected before that migration can succeed.

5. Configure authentication in **Supabase Dashboard → Authentication → URL Configuration**:

   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
   - Redirect URL: `http://localhost:3000/auth/confirm`

   Add the production equivalents before deployment. Enable email/password sign-up under **Authentication → Providers → Email**.

   For email confirmation that works when the user opens their inbox on a different device, open **Authentication → Email Templates → Confirm signup** and set the confirmation link to:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```

   `/auth/confirm` verifies the token hash, establishes the cookie session, and redirects to `/dashboard`. The existing `/auth/callback` also supports PKCE code exchange when using Supabase's default confirmation link; that flow must be completed in the same browser used for sign-up. Both routes reject failures safely and never accept an arbitrary redirect destination. With confirmation disabled, sign-up signs the user in immediately.

6. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Database design and security

The version-controlled migration creates:

- `mock_projects`: globally unique project slugs owned by an Auth user.
- `mock_endpoints`: exact method-and-path configurations, unique within a project.
- `request_logs`: minimal request metadata with bounded query-parameter storage.

Deleting a user cascades to their projects; deleting a project cascades to its endpoints; deleting an endpoint cascades to its request logs. Project and endpoint timestamps are maintained by a database trigger.

RLS is enabled on every application table:

- Authenticated users can manage only their own projects and related endpoints.
- Authenticated users can read only logs connected to their own projects.
- No browser-facing role can insert, update, or delete request logs, or truncate any application table.
- Anonymous users have no application-table privileges; no anonymous management policies exist.

Endpoint responses are bounded to 64 KiB of JSONB text and final HTTP statuses 200–599. The future runtime must omit the response body for 204, 205, and 304 statuses. Query-parameter logs are bounded to 8 KiB. Secret filtering belongs in the Phase 4 log writer; JSONB storage alone does not redact secrets.

The later public mock engine will use a server-only administrative client, which bypasses RLS solely for runtime lookup and logging.

## Demo data

`supabase/seed.sql` provides optional sample data for a disposable/local project. It attaches a sample project and endpoint to the oldest existing Auth user and skips safely when no user exists or the demo slug is already taken. Re-running it never overwrites existing project or endpoint configuration. It is not part of production behavior.

Apply the migrations, create a test user through `/signup`, and run the contents of `supabase/seed.sql` in that test project's SQL Editor. For a local Supabase instance started with `npx supabase start`, the same SQL can be run in local Studio or with `psql`:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Do not run `supabase db reset` to seed an already created user: reset deletes Auth users as well as application data. After any deliberate reset, create the user again, then run the seed manually.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The Vitest suite covers server-side login/sign-up validation, safe auth failure handling, sign-out, server-verified dashboard guards, confirmation routes, redirect safety, configuration, and refreshed cookie/cache-header propagation. It mocks Supabase Auth and does not prove live email delivery or database RLS behavior. Use `npm run test:watch` during development.

`supabase/tests/rls.sql` exercises real database policies for two synthetic users: visibility, forged ownership, cross-user mutations, endpoint reassignment, log-write restrictions, anonymous access, non-RLS privileges, and cascading deletion. On a disposable/local Supabase database after migrations, run:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

Alternatively, run the whole script as `postgres` in the SQL Editor of a disposable Supabase project. The script wraps fixtures and assertions in a transaction and rolls them back. If running interactively and an assertion fails, execute `ROLLBACK;` before continuing. This SQL suite requires a database and is separate from `npm test`.

### Phase 1 verification record — October 23, 2026

- Passed: ESLint, strict TypeScript checking, all 35 Vitest tests, and the production Next.js build.
- Passed against a local production server without Supabase credentials: HTTP checks for `/`, `/login`, `/signup`, protected dashboard redirection, and invalid confirmation redirects.
- Passed in headless Chromium: landing layout at 320px, 390px, and 1440px; visible/unclipped hero content and navigation; CTA navigation; mobile auth setup notices; disabled unconfigured forms; signed-out dashboard redirection; no browser runtime exceptions.
- Live Supabase checks after credentials and migrations were configured: Auth settings are reachable, email/password signup is enabled, and email confirmation is required. Queries to all three application tables succeed with the server key (HTTP 200); anonymous queries are denied (HTTP 401, PostgreSQL code `42501`). `NEXT_PUBLIC_SITE_URL` is configured for local development.
- Not executed: live Supabase sign-up/login, email delivery, authenticated dashboard data reads, and the SQL RLS suite. Anonymous access checks do not establish isolation between two authenticated users; that still requires the SQL suite or two test accounts.
- Dependency audit: no production vulnerabilities reported. The full audit reports five high-severity development-tool findings along the ESLint → fast-glob → micromatch → braces dependency chain. The installed/latest `braces` version remains affected; npm's suggested fix downgrades the Next.js ESLint configuration to version 14. Keep the configuration aligned with Next.js 16 and revisit when an upstream fix is available.

## Phase 1 manual checklist

- Load `/` and verify responsive landing-page navigation and CTAs.
- With Supabase variables absent, verify `/` still loads, auth pages explain setup, and `/dashboard` redirects to `/login`.
- Create an account at `/signup`.
- Confirm the email if confirmation is enabled.
- With the token-hash email template, confirm from another browser and verify that `/dashboard` opens.
- Visit an expired or invalid confirmation URL and verify the safe login notice.
- Log in at `/login` and verify the redirect to `/dashboard`.
- Open `/dashboard` while signed out and verify redirection to `/login`.
- While signed in, visit `/login` and `/signup` and verify redirection to `/dashboard`.
- Confirm the dashboard shows database-backed zero counts for a new account.
- Sign out and verify the session is cleared.
- On mobile, open the navigation and verify the sign-out control is reachable by keyboard.
- Create a second user and verify that RLS prevents either account from reading the other's rows.

The last RLS check can use the SQL suite above. CRUD, runtime response matching, and request-history end-to-end checks begin in later phases because those features are not implemented yet.

## Vercel deployment

1. Import the repository into Vercel.
2. Add the public Supabase variables and site origin from `.env.example` for the relevant environments. The server-only runtime key is required starting in Phase 3.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical deployment origin.
4. Set Supabase Auth's Site URL to the production origin and add `https://your-domain/auth/callback` and `https://your-domain/auth/confirm` to its redirect URLs. Keep the confirmation email template consistent with the selected flow.
5. Apply migrations to the production Supabase project before opening the dashboard.

Vercel can use the default Next.js build command, `npm run build`.

## Phase roadmap

- **Phase 1 — implemented:** foundation, design system, auth, database migrations, landing page, protected dashboard shell, and auth regression tests. Live Supabase verification requires the setup above.
- **Phase 2:** database-backed project and endpoint CRUD, validation, URL generation, and endpoint details.
- **Phase 3:** public catch-all mock runtime, exact matching, CORS, configured responses, and consistent errors.
- **Phase 4:** request inspector, automated tests, UX refinement, and deployment finalization.
