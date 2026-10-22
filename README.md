# MockForge

MockForge is a developer-focused web application for creating persistent mock REST API endpoints without writing backend code. Users manage projects and JSON responses in a protected dashboard, while generated mock URLs remain publicly callable by frontend applications.

Phases 1–3 implement Supabase SSR authentication, owner-protected project/endpoint management, JSON configuration, a responsive dashboard, and public mock serving. Generated URLs now return their database-backed JSON and configured status. Request logging and inspection follow in Phase 4; mock calls do not populate request history or increase recorded-request counts yet.

## Architecture

```mermaid
flowchart LR
  Browser[Browser] --> Next[Next.js App Router]
  Next --> Auth[Supabase Auth]
  Next --> UserClient[Authenticated Supabase client]
  UserClient --> RLS[Owner-scoped RLS]
  PublicClient[Frontend application] --> Runtime[Public mock route handler]
  Runtime --> Admin[Server-only administrative client]
  Admin --> DB[(PostgreSQL endpoint configuration)]
  RLS --> DB
```

The dashboard uses cookie-based Supabase sessions and verifies the current user on the server before rendering private content or querying workspace data. Normal data access uses the authenticated client and remains constrained by PostgreSQL RLS. The public runtime uses the service role only inside server code to resolve the requested project and endpoint, returning only its configured response. Request logging is not implemented yet.

`proxy.ts` refreshes sessions on dashboard and authentication pages and preserves Supabase's refreshed cookies and cache headers. Authenticated responses are not publicly cached. Public pages work without Supabase configuration; auth pages show a setup notice and disable submission until configuration is present. Server and administrative clients use `server-only` guards so they cannot be imported into browser components.

## Stack

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- Tailwind CSS 4
- Supabase PostgreSQL and Auth
- `@supabase/ssr` for cookie-based sessions
- Zod for server-side input validation
- ESLint, Vitest for unit tests, and Playwright for live management/runtime tests

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

   Dashboard operations need the two public Supabase values and the site origin. The server key is required for public mock serving and temporary account setup/cleanup in optional live tests. Never rename it with a `NEXT_PUBLIC_` prefix or expose it to browser code. Use the API key labelled **Publishable** (or the legacy `anon` key) for the public client, never a secret or service-role key.

   `NEXT_PUBLIC_SITE_URL` must be an HTTP(S) origin without a path. Set it explicitly in production; sign-up does not silently fall back to localhost there. Restart the dev server after editing environment variables, and rebuild after changing any `NEXT_PUBLIC_` value in production.

4. Apply the database migrations. For a fresh CLI checkout, initialize the CLI configuration once, then link to the intended Supabase project:

   ```bash
   npx supabase init
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

   Alternatively, run these files in the Supabase SQL Editor **in order, once each**:

   - `supabase/migrations/20261022190000_initial_schema.sql`
   - `supabase/migrations/20261023090000_foundation_hardening.sql`
   - `supabase/migrations/20261023120000_endpoint_configuration.sql`

   Run only migrations you have not already applied. If Phase 1 is set up, only the third migration is new. It preserves JSON `null` values sent through PostgREST and adds canonical path validation. Correct any existing noncanonical paths before applying it. The hardening migration requires existing endpoints to use statuses 200–599 and JSON within 64 KiB. **Phase 3 needs no additional migration** if all three files are already applied.

5. Configure authentication in **Supabase Dashboard → Authentication → URL Configuration**:

   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
   - Redirect URL: `http://localhost:3000/auth/confirm`

   Add the production equivalents before deployment. Enable email/password sign-up under **Authentication → Providers → Email**.

   For email confirmation that works when the user opens their inbox on a different device, open **Authentication → Email Templates → Confirm signup** and set the confirmation link to:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
     >Confirm your email</a
   >
   ```

   `/auth/confirm` verifies the token hash, establishes the cookie session, and redirects to `/dashboard`. The existing `/auth/callback` also supports PKCE code exchange when using Supabase's default confirmation link; that flow must be completed in the same browser used for sign-up. Both routes reject failures safely and never accept an arbitrary redirect destination. With confirmation disabled, sign-up signs the user in immediately.

6. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Database design and security

The version-controlled migrations create:

- `mock_projects`: globally unique project slugs owned by an Auth user.
- `mock_endpoints`: exact method-and-path configurations, unique within a project.
- `request_logs`: minimal request metadata with bounded query-parameter storage.

Deleting a user cascades to their projects; deleting a project cascades to its endpoints; deleting an endpoint cascades to its request logs. Project and endpoint timestamps are maintained by a database trigger.

RLS is enabled on every application table:

- Authenticated users can manage only their own projects and related endpoints.
- Authenticated users can read only logs connected to their own projects.
- No browser-facing role can insert, update, or delete request logs, or truncate any application table.
- Anonymous users have no application-table privileges; no anonymous management policies exist.

Endpoint responses are bounded to 64 KiB of JSONB text and final HTTP statuses 200–599. The runtime omits the response body for 204, 205, and 304 statuses. Query-parameter logs are bounded to 8 KiB. Secret filtering belongs in the Phase 4 log writer; JSONB storage alone does not redact secrets.

The public mock engine uses a server-only administrative client, which bypasses RLS for scoped runtime lookups. It does not inherit the caller's authorization headers or cookies. Anyone with an active mock URL can read its response; never save secrets in response JSON.

## Project and endpoint management

- `/dashboard/projects`: paginated project list and project creation.
- `/dashboard/projects/[projectId]`: project details, URL prefix, endpoints, editing, and confirmed deletion.
- `/dashboard/projects/[projectId]/endpoints/new`: method, path, status, active state, and JSON response configuration.
- `/dashboard/projects/[projectId]/endpoints/[endpointId]`: saved response preview, URL/JSON copying, edit, enable/disable, and confirmed deletion.
- `/dashboard/endpoints`: paginated endpoint list across the owner's projects.

Server Actions verify the authenticated user and constrain project mutations by owner. Every endpoint mutation first verifies the parent project and includes both project and endpoint IDs in its filters. All normal operations use the authenticated client, with RLS as an additional boundary. Unique constraints handle concurrent slug and method/path conflicts; visitors see inline errors rather than database details. Deleting a project also deletes its endpoints and request logs; both deletion forms require the current slug or method/path and verify that confirmation on the server.

Shared Zod schemas validate forms in the browser and on the server. Project slugs are globally unique, lowercase, 3–63 characters, and changing one changes every URL in the project. Paths are case-sensitive, start with `/`, and allow URL-safe ASCII letters, digits, `_`, `-`, `.`, and `~` in slash-separated segments. Repeated and trailing slashes are normalized; `/` is the root endpoint. Dot segments, encoded characters, queries, wildcards, and dynamic parameters are rejected. List pages load 12 records at a time.

JSON responses can be objects, arrays, strings, booleans, numbers, or `null`. Validation rejects NUL characters, malformed Unicode, non-finite numbers, unsafe integers (store large IDs as strings), nesting beyond 64 levels, and payloads larger than 64 KiB. The third migration converts PostgREST's SQL NULL representation into JSONB `null` before the column's NOT NULL check. HTTP 204, 205, and 304 keep the saved JSON for later edits, but their runtime responses have no body.

URL previews use the canonical `NEXT_PUBLIC_SITE_URL`, project slug, and normalized path. Saved active endpoints are publicly callable; inactive ones return 404. The UI marks request history as forthcoming and does not fabricate request activity.

## Public mock runtime

Call `/mock/{project-slug}/{endpoint-path}` with the saved method. A root-path endpoint uses `/mock/{project-slug}`. For example, after creating an active GET `/products` endpoint in a project with slug `demo`:

```bash
curl -i 'http://localhost:3000/mock/demo/products?category=books'
```

From a frontend on another origin:

```js
const response = await fetch("http://localhost:3000/mock/demo/products", {
  credentials: "omit",
});
const data = await response.json(); // Skip for bodyless 204, 205, or 304 responses.
```

- GET, POST, PUT, PATCH, and DELETE return the saved JSON value directly, with the configured status. Incoming request bodies do not affect the response and are not forwarded to Supabase.
- Matching is by project slug, exact case-sensitive path, and method. Queries do not affect routing. `/products` does not match `/Products` or `/products/123`. Trailing slashes are normalized without redirects, including for preflights.
- Every call performs fresh, uncached database lookups. Editing JSON/status, disabling an endpoint, changing a method/path/slug, and deleting configuration affect subsequent requests. Responses include `no-store` browser/CDN headers. Each database lookup has a five-second timeout.
- OPTIONS validates the target path and requested method, returns 204 for an available method, and advertises only active methods plus OPTIONS. Valid requested header names are explicitly allowed, including `Content-Type`, `Authorization`, and custom names. Preflight responses are not cached.
- CORS allows any origin but does not enable credentialed browser requests. Use `credentials: 'omit'`, not `'include'`. An Authorization header does not make a public endpoint private. Runtime errors also include CORS headers, and `Allow` is exposed to browsers.
- HEAD is not a configurable method: an active path returns 405 with `Allow`; an unknown/inactive path returns 404. HEAD never carries a response body. Statuses 204, 205, and 304 also omit the body and JSON content type.

Runtime-generated errors have a consistent shape (user-configured error responses still return the user's JSON):

```json
{
  "error": {
    "code": "ENDPOINT_NOT_FOUND",
    "message": "No active mock endpoint matches this request."
  }
}
```

| Status | Code                  | Meaning                                                                                          |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------ |
| 400    | `INVALID_REQUEST`     | Missing/invalid slug, unsupported path syntax, or malformed preflight fields                     |
| 404    | `ENDPOINT_NOT_FOUND`  | Unknown project/path or an inactive requested endpoint                                           |
| 405    | `METHOD_NOT_ALLOWED`  | Active path without the requested method; includes `Allow`                                       |
| 414    | `URI_TOO_LONG`        | Endpoint path over 200 characters or URL query over 8,192 characters, including `?`              |
| 503    | `SERVICE_UNAVAILABLE` | Missing server configuration, unavailable database, timed-out lookup, or invalid stored response |

The request parser rejects percent-encoded aliases in paths. CORS header-name lists are limited to 2,048 characters and 32 entries. Next.js, browsers, or the hosting layer may normalize malformed paths (including repeated slashes/dot segments) or reject unsupported methods such as TRACE/CONNECT before the route handler; those upstream responses are outside its JSON/CORS guarantees. Always use the generated canonical URL.

Implementation is split into the thin `app/mock/[[...segments]]/route.ts` adapter, `lib/mock/request.ts` validation, `lib/mock/handler.ts` HTTP behavior, and `lib/mock/store.ts` database queries. Database/provider errors are never returned to callers; the server emits only a constant failure diagnostic. No incoming request headers, body, or query values are persisted by the runtime. Request logging and inspection remain Phase 4.

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

The Vitest suite covers auth, configuration, JSON/path validation, method/status validation, duplicate handling, deletion confirmation, mutation ownership checks, and runtime routing/responses/CORS/errors/cache behavior. Runtime store tests verify bounded, project-scoped queries and timeout signals. It mocks Supabase and does not establish live database behavior. Use `npm run test:watch` during development.

### Live browser and RLS checks

Use a test Supabase project with migrations applied and its keys in `.env.local`. Stop other Next.js servers for this checkout first because these checks build into the same `.next` directory. Then run:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite starts a production build on port 3100. It creates temporary, preconfirmed Auth users with `mockforge-e2e-…@example.invalid` addresses. Management tests use two users, sign in through the UI, exercise real project/endpoint CRUD, verify persistence and validation, check copying/mobile controls, and attempt cross-user reads, writes, parent reassignment, and dashboard navigation. The runtime test creates its own user/configuration and checks anonymous methods/statuses, root JSON `null`, exact matching, errors, fresh edits/deletion, project separation, and real cross-origin Chromium fetches with preflight. It deletes only its temporary users afterward, cascading their test projects and endpoints. The service key is used for fixture account management and by the public runtime; test CRUD and isolation checks use each user's session. Traces and videos are disabled to avoid recording authentication material.

All three migrations are required for the runtime suite. Enable the additional management JSON `null` and database path-constraint test explicitly:

```bash
MOCKFORGE_PHASE2_MIGRATION_APPLIED=true npm run test:e2e
```

Without that flag, this one test is explicitly skipped. Browser screenshots of test endpoint pages are stored in gitignored `test-results/`.

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

The last RLS check can use the SQL suite or browser suite above. The user has manually verified live sign-up and authentication. Phase 3 adds runtime matching tests; request-history tests remain Phase 4.

## Phase 2 manual checklist

- Create a project and verify its slug, description, and dashboard count.
- Try the same slug again and confirm a readable error while entered values remain intact.
- Edit a project; changing its slug must warn about URL changes and update endpoint URL previews.
- Create a GET endpoint with a JSON object, then reload its detail page to confirm persistence.
- Try invalid JSON, invalid paths/statuses, oversized JSON, and a duplicate method/path; verify inline errors.
- Create a second method on the same path; it should be allowed.
- Format and copy JSON, copy the generated URL, and inspect the saved status and active state.
- Edit the method, path, status, and response; disable/enable and verify persistence after reload.
- After the third migration, save a root-path endpoint with JSON `null` and inspect the saved value.
- Open another user's project and endpoint URLs and try direct API mutations; access must be denied.
- Cancel a delete dialog with Escape, reject incorrect confirmation text, then delete a test endpoint/project with correct confirmation.
- Confirm project deletion removes its endpoints and updates the dashboard/list counts.
- Check forms, lists, and navigation on a narrow mobile viewport.
- Call the generated URL using the Phase 3 checklist below; request history arrives in Phase 4.

## Phase 2 verification record — October 23, 2026

- Passed: ESLint, TypeScript checking, all 116 Vitest tests, and the production build.
- Passed: the live Playwright management flow against Supabase, including project and endpoint creation/editing, duplicate validation, JSON persistence, clipboard actions, active toggles, mobile navigation, confirmed deletion, and project-to-endpoint cascade deletion.
- Passed with separate authenticated users: cross-user project/endpoint reads and writes are blocked, endpoint reassignment to another user's project is rejected, and unauthorized dashboard detail/edit URLs show an unavailable state.
- Temporary test accounts and their associated data were cleaned up after the runs. No user-created projects were used for testing.
- Passed after applying `20261023120000_endpoint_configuration.sql`: the remaining live integration test saved and retrieved a JSON `null` response at the root endpoint path and confirmed that the database rejects dot-segment paths. Both Phase 2 browser tests have now passed in separate runs; no Phase 2 integration check remains skipped.
- Public mock serving and request-history functionality remain scheduled for Phases 3 and 4.

## Phase 3 manual checklist

- Create an active GET `/products` endpoint, copy its URL, and call it while signed out. Confirm the saved JSON, status, JSON content type, and `Cache-Control: no-store`.
- Add POST on the same path with a different response/status; call both methods and verify each configuration is returned.
- Call with a query string and a trailing slash; the saved endpoint should still resolve. Change path case or add a subpath; expect 404.
- Save arrays, scalars, and JSON `null`; verify the public response preserves each value without an extra wrapper.
- Set statuses 204, 205, and 304; confirm no response body is sent.
- Use an unavailable method on an active path; expect 405 and `Allow`. Disable the endpoint; its configured method should return 404.
- Fetch from another browser origin with `credentials: 'omit'`. For POST, include JSON and a custom header to exercise OPTIONS preflight.
- Edit JSON/status and call the same URL again immediately; verify the new configuration. Change path/project slug and verify the old URL stops resolving that endpoint.
- Delete a test endpoint/project and confirm its old public URLs return 404.
- Recheck that another user cannot access the management configuration even though the configured mock response is public.
- Request counts/history do not change yet; logging and the inspector are Phase 4.

## Phase 3 verification record — October 23, 2026

- Passed: ESLint, strict TypeScript checking, all 187 Vitest tests, and the production build used by Playwright.
- Passed: both existing live management tests, including CRUD, mobile controls, two-user isolation, JSON `null` persistence, and database path constraints.
- Passed: the live runtime test against Supabase, covering all five configured methods, JSON objects/arrays/scalars/`null`, custom statuses, bodyless statuses, anonymous calls with ignored auth headers, root paths, query-independent exact matching, 404/405/400/414 errors, HEAD, and trailing-slash calls/preflights without redirects.
- Passed in Chromium using real `localhost` and `127.0.0.1` origins: cross-origin POST with JSON, Authorization, and custom headers, plus reading a JSON 405 response and its exposed `Allow` header.
- Passed: project separation and fresh responses after changing JSON/status, disabling/re-enabling, changing method/path/project slug, and deleting endpoints/projects. All three live tests passed across the management run and the targeted runtime rerun; no live check remains skipped.
- Test setup fixes: mixed bulk inserts now request database defaults for omitted fields; browser CORS uses a real page because Chromium's local-network protection rejects requests from the original intercepted document. No browser protections were disabled.
- Temporary test users and their cascading fixture data were removed after each run. No existing user-created projects were used or modified. Deleted test fixtures are disposable and are recreated by the suite.
- Failure cases for missing configuration, database lookup errors/timeouts, and invalid stored responses were verified with unit mocks, not by disrupting the live Supabase project. The standalone SQL RLS suite and Vercel deployment were not run in this phase.
- No new SQL migration. Request logging, request-count updates, and the inspector remain Phase 4.

## Vercel deployment

1. Import the repository into Vercel.
2. Add the public Supabase variables, site origin, and server-only runtime key from `.env.example` for the relevant environments.
3. Set `NEXT_PUBLIC_SITE_URL` to the canonical deployment origin.
4. Set Supabase Auth's Site URL to the production origin and add `https://your-domain/auth/callback` and `https://your-domain/auth/confirm` to its redirect URLs. Keep the confirmation email template consistent with the selected flow.
5. Apply migrations to the production Supabase project before opening the dashboard.

Vercel can use the default Next.js build command, `npm run build`.

## Phase roadmap

- **Phase 1 — implemented:** foundation, design system, auth, database migrations, landing page, protected dashboard shell, and auth regression tests. Live authentication verified by the user.
- **Phase 2 — implemented and verified:** database-backed project and endpoint CRUD, shared validation, URL previews, endpoint details, confirmation dialogs, pagination, and management tests. The third migration is applied; live JSON `null` persistence and database path constraints are verified.
- **Phase 3 — implemented and verified:** public catch-all mock runtime, fresh database lookups, exact matching, browser CORS, configured JSON/statuses, consistent errors, and unit/live runtime tests.
- **Phase 4:** request logging and inspector, request-history tests, UX refinement, and deployment finalization.
