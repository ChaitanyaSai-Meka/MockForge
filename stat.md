# Project: MockForge — A Dynamic Mock API Platform

Act as a senior full-stack engineer and product designer. Build a production-minded, deployable MVP of **MockForge**, a web application that allows developers to create custom mock REST API endpoints without writing backend code.

Do not build a static UI prototype. The application must have a real frontend, a real backend, persistent PostgreSQL storage, authentication, API request handling, and request history.

## 1. Product vision

Developers often need API responses while building a frontend, but their actual backend may not exist yet.

MockForge solves this problem. Users create an endpoint through a visual interface, configure its HTTP method, response status, and JSON response body, and immediately receive a URL they can call from their application.

Example:

A user creates a project with the slug `demo` and adds an endpoint:

- Method: GET
- Path: `/products`
- Status: `200`
- Response body:

```json
{
  "products": [
    {
      "id": 1,
      "name": "MacBook Pro",
      "price": 199999
    },
    {
      "id": 2,
      "name": "iPhone",
      "price": 79999
    }
  ]
}
```

If the deployed application is hosted at `https://example.vercel.app`, the generated mock URL is:

`https://example.vercel.app/mock/demo/products`

A GET request to that URL must return the configured JSON response with the configured HTTP status code.

The configuration must be loaded from PostgreSQL at request time. Do not hardcode endpoint responses or implement the core functionality using localStorage, in-memory arrays, or fake API data.

All mock URLs are publicly accessible in the MVP. Display a clear warning in the dashboard that anyone with a mock URL may access its configured response. Protect the management dashboard and stored user data separately.

## 2. Technology stack

Use the following stack:

- Next.js App Router
- React
- TypeScript with strict type checking
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- `@supabase/ssr` for cookie-based server-side authentication
- Zod for input validation
- Vercel for deployment
- Vitest or an existing suitable test framework for unit tests

Use compatible, stable package versions and follow the official documentation for the installed versions.

Use Next.js Route Handlers for the mock API engine. Do not create a separate Express server unless the existing repository has a compelling technical constraint.

Keep the architecture simple. No microservices, Redis, payment gateway, AI chatbot, or unnecessary libraries in the MVP.

## 3. User interface and pages

Build a visually polished developer tool with a consistent design system, clean typography, good spacing, responsive layouts, and accessible controls.

### Landing page: `/`

Include:
- Product name and a clear value proposition.
- A primary CTA to get started.
- A short explanation of how to create a mock API.
- A realistic example showing a request URL and a JSON response.
- A feature section for endpoint creation, custom responses, and request inspection.
- A clear, professional footer.

The landing page must feel like a real developer product, not a generic college project template.

### Authentication

Implement:
- `/login`
- `/signup`

Use Supabase email/password authentication. Handle authentication errors, loading states, sign-out, and redirects properly.

Private dashboard routes must verify the authenticated user on the server.

### Dashboard: `/dashboard`

Display:
- Number of projects.
- Number of configured endpoints.
- Number of recorded requests, where available.
- Recent endpoint activity.
- A clear button to create a project or endpoint.
- Useful empty states for a new account.

All statistics must come from the database, not hardcoded numbers.

### Project management

Implement:
- Project listing.
- Project creation.
- Project details.
- Project editing.
- Project deletion with an appropriate confirmation.

Each project must have a name, unique URL-safe slug, optional description, and creation/update timestamps.

### Endpoint management

Allow users to create, inspect, edit, disable, and delete endpoints belonging to their projects.

For each endpoint, support:

- HTTP method: GET, POST, PUT, PATCH, DELETE.
- URL path, such as `/products` or `/users`.
- Configurable HTTP response status.
- Editable JSON response body.
- Active/inactive status.
- Generated full URL based on the deployment hostname and project slug.
- Copy-to-clipboard functionality for the generated URL.
- An endpoint detail view with response preview and request history.

Validate JSON before saving. Show clear inline validation errors rather than silently accepting invalid JSON.

Prevent duplicate method-and-path combinations within the same project.

Support exact path matching in the first release. Wildcards, dynamic path parameters, custom domains, and other advanced routing features are out of scope.

### Request inspector

Show recent requests for the user's endpoints.

For each request, display:
- HTTP method.
- Requested path.
- Response status.
- Response time in milliseconds.
- Timestamp.
- Relevant query parameters when available.

Allow users to inspect individual records and filter activity by endpoint.

Do not store authorization headers, cookies, API keys, passwords, or other secrets in request logs. Keep stored request details minimal and apply reasonable input-size limits.

Paginate the history instead of loading all records indefinitely.

## 4. Database design

Create version-controlled SQL migrations under a `supabase/migrations/` directory.

Use PostgreSQL UUID primary keys, foreign keys, appropriate indexes, constraints, and timestamps.

### Table: `mock_projects`

Fields:
- `id`
- `owner_id`, referencing the authenticated Supabase user
- `name`
- `slug`, globally unique and URL-safe
- `description`, nullable
- `created_at`
- `updated_at`

### Table: `mock_endpoints`

Fields:
- `id`
- `project_id`, referencing `mock_projects`
- `method`
- `path`
- `status_code`
- `response_body`, stored as JSONB
- `is_active`
- `created_at`
- `updated_at`

Add a uniqueness constraint on `(project_id, method, path)`.

Validate method, path, status code, and response JSON appropriately.

### Table: `request_logs`

Fields:
- `id`
- `endpoint_id`, referencing `mock_endpoints`
- `method`
- `requested_path`
- `query_params`, stored as JSONB where appropriate
- `status_code`
- `duration_ms`
- `created_at`

Create indexes for common project/endpoint lookups and for request-history queries.

Use sensible foreign-key deletion behavior and document it.

Add an updated-at trigger or another consistent mechanism for updating timestamps.

## 5. Authentication and security

Security is a core requirement, not a UI feature.

Implement these protections:

1. A user may read and manage only their own projects, endpoints, and request logs.
2. Every endpoint mutation must verify that the authenticated user owns the parent project.
3. A client-supplied user ID must never be trusted for ownership decisions.
4. Enable Row Level Security on every exposed application table, with explicit policies for permitted operations.
5. Use authenticated Supabase clients for normal user operations and rely on RLS as an additional security boundary.
6. The public mock runtime may use a server-only Supabase administrative client to resolve active endpoint configurations and insert request logs.
7. If using a service-role key, keep it exclusively on the server. Never place it in a `NEXT_PUBLIC_` variable or send it to the browser.
8. Validate all form inputs and API mutations on the server as well as in the UI.
9. Return consistent JSON error responses for invalid input, missing endpoints, disabled endpoints, and unsupported methods.
10. Never expose database errors, stack traces, environment variables, or secrets to visitors.

Use the current recommended Supabase SSR setup for the installed Next.js version, including session refresh handling where required. Avoid deprecated Supabase Auth helper packages.

Keep project configuration private to its owner. The public runtime should expose only the response configured for the endpoint that was requested.

## 6. Dynamic mock API engine

This is the most important engineering component.

Implement a catch-all route handler at a path equivalent to:

`app/mock/[...segments]/route.ts`

Adapt the implementation to the installed Next.js version and its current route-handler parameter types.

Support GET, POST, PUT, PATCH, DELETE, and OPTIONS where appropriate for CORS preflight.

### Request resolution

For a request such as:

`GET /mock/demo/products`

The engine must:

1. Extract the project slug `demo`.
2. Normalize the remaining URL path to `/products`.
3. Resolve the project and requested endpoint from PostgreSQL.
4. Match the HTTP method and exact path.
5. Check whether the project exists and the endpoint is active.
6. Return the configured JSON response body with the configured HTTP status code.
7. Record the request outcome and response duration in `request_logs`.

The query string must not affect endpoint path matching. For example, `/mock/demo/products?category=books` should resolve to `/products`.

### Error behavior

- Unknown project or endpoint: return HTTP 404 with a consistent JSON error.
- Inactive endpoint: return HTTP 404.
- Existing path with an unsupported method: return HTTP 405 and an appropriate `Allow` header.
- Invalid or unsupported request: return the appropriate HTTP error without exposing internal details.

A database logging failure must not accidentally replace a valid configured mock response with an unrelated error. Handle and report logging failures safely.

### HTTP and CORS behavior

- Return JSON with the correct `Content-Type`.
- Return the configured response status code.
- Support CORS for public mock endpoints so frontend applications hosted on different origins can consume them.
- Handle OPTIONS preflight requests appropriately.
- Never assume an authentication header makes a public endpoint private.
- Do not cache mock responses in a way that serves stale configurations after users edit them.

Keep the matching logic in small, testable functions rather than putting every responsibility into one enormous route handler.

## 7. Dashboard experience and implementation quality

Make the product feel like a developer tool:

- A consistent application shell and sidebar.
- Clear HTTP method badges.
- A readable JSON editor built with a textarea or a lightweight appropriate component.
- JSON formatting and validation.
- A request/response preview.
- Copy URL and copy JSON actions.
- Toasts or similarly clear success/error feedback.
- Confirmation dialogs for destructive actions.
- Loading indicators, empty states, and useful error states.
- Responsive behavior on desktop and mobile.
- Accessible labels and keyboard-friendly controls.

Prefer reusable components and a small, understandable component hierarchy.

Do not introduce elaborate animations or design flourishes that delay delivery.

## 8. Configuration and documentation

Create:
- `.env.example` with all required variable names and safe placeholders.
- A `README.md` with project overview, architecture, setup, migrations, authentication setup, environment variables, testing, and deployment instructions.
- A concise architecture diagram, preferably Mermaid in the README.
- SQL migrations for all required tables, indexes, triggers, and RLS policies.
- A way to create realistic demo data without hardcoding production behavior.

Use the appropriate current Supabase project URL, publishable key, and server-only service-role/secret key as supported by the chosen client configuration.

Never commit `.env.local`, real credentials, or secrets.

## 9. Testing requirements

Test the most important behavior:

- Successful endpoint lookup and JSON response.
- Correct handling of different HTTP methods.
- Unknown project and endpoint behavior.
- Inactive endpoint handling.
- Path normalization and exact matching.
- Invalid JSON and invalid endpoint configuration.
- Correct status codes and error responses.
- Request-history creation and failure handling.
- Protection against cross-user access.
- Database RLS policy behavior wherever the environment permits.

Write a clear manual test checklist that covers signing up, creating a project, creating an endpoint, calling the generated URL, inspecting request history, editing an endpoint, and trying to access another user's data.

Do not claim that a test passed unless it was actually executed. Report skipped tests and missing external configuration honestly.

## 10. Development process

Work in the following phases.

### Phase 1 — Foundation
Inspect the existing repository, scaffold only what is needed, establish the design system and application shell, configure Supabase clients and authentication, create SQL migrations with RLS policies, and implement a working landing page and protected dashboard shell.

### Phase 2 — Project and endpoint management
Implement real database-backed project CRUD, endpoint CRUD, JSON validation, generated URLs, and an endpoint detail page.

### Phase 3 — Mock API runtime
Implement the catch-all route handler, endpoint lookup, HTTP method matching, CORS behavior, configured responses, and consistent errors.

### Phase 4 — Request history and finalization
Implement request logging and the request inspector, add tests, refine responsive UI and error handling, write documentation, and prepare the application for Vercel deployment.

Complete one phase at a time. At the end of each phase, summarize changed files, important implementation decisions, checks actually run, known issues, and what the next phase will accomplish. Then stop for my next instruction.

## 11. Rules for working with me

I am a computer science student who understands React, Next.js, Node.js, Express, PostgreSQL, and related web development fundamentals. I am using Codex to accelerate implementation, but I also need to understand the code.

Therefore:

- Prefer straightforward, readable implementations over clever abstractions.
- Explain important architecture decisions briefly.
- Do not dump the entire application into one giant file.
- Do not build every feature at once.
- Do not add unrequested functionality.
- Do not replace real backend operations with mock frontend data.
- Do not rewrite unrelated files in an existing repository.
- Inspect the existing repository before modifying it.
- Use sensible defaults and keep moving unless a genuine blocker requires my input.
- Run relevant lint, type-check, test, and build commands after each phase when possible.
- Fix errors caused by your changes rather than merely listing them.
- Identify anything that needs manual setup in the Supabase or Vercel dashboard.
- Do not invent credentials, deployment URLs, usage statistics, or successful test results.
- If external credentials are missing, finish the code and migrations as far as possible, clearly identify what cannot be verified, and provide the exact setup steps.

**Start now:** inspect the current repository, state a brief implementation plan, and implement Phase 1 only. Do not proceed into later phases until I ask you to continue.
