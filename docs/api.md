# API and request-history reference

## Endpoint configuration

Projects have globally unique lowercase slugs, 3–63 characters long. Changing a project slug changes every mock URL in that project.

An endpoint is a unique combination of project, HTTP method, and path. Supported methods are GET, POST, PUT, PATCH, and DELETE. Responses accept final statuses 200–599 and JSON objects, arrays, strings, numbers, booleans, or `null`.

Paths are case-sensitive and limited to 200 characters. They start with `/` and contain letters, digits, `_`, `-`, `.`, `~`, and slash-separated segments. Repeated and trailing slashes are normalized when saving. Dot segments, percent encoding, query strings, wildcards, and dynamic parameters are not valid configuration paths.

Response JSON is limited to 64 KiB and 64 nesting levels. NUL characters, malformed Unicode, non-finite numbers, and unsafe integers are rejected. Store large numeric identifiers as strings. Statuses 204, 205, and 304 retain the saved configuration but send no body or JSON content type.

## Calling an endpoint

```text
/mock/{project-slug}/{endpoint-path}
```

A root-path endpoint uses `/mock/{project-slug}`. Query strings do not affect matching. `/products` does not match `/Products` or `/products/123`; trailing slashes resolve without a redirect.

Responses return the configured JSON directly, without an additional wrapper. Request bodies, authorization headers, and cookies do not affect the response and are not forwarded to Supabase. An authorization header does not make an endpoint private.

Each call reads fresh configuration from PostgreSQL. Browser and CDN cache headers use `no-store`. Each lookup has a five-second timeout.

## CORS and HTTP behavior

- Any origin can call public endpoints. Credentialed browser requests are not supported; use `credentials: "omit"`.
- OPTIONS validates the path and requested method. Successful preflights return 204 and advertise active methods plus OPTIONS.
- Valid requested header names are explicitly allowed, including Authorization and custom headers. Lists are limited to 2,048 characters and 32 entries. Preflights are not cached.
- Runtime-generated errors also include CORS headers, and `Allow` is exposed to browsers.
- HEAD is not configurable. An active path returns 405 with `Allow`; an unknown or inactive path returns 404. HEAD responses have no body.

Browsers, Next.js, or the host may normalize malformed paths or reject methods such as TRACE/CONNECT before the route handler runs. Those upstream responses are outside its JSON/CORS guarantees. Use the generated canonical URL.

## Errors

Runtime-generated errors use this shape. User-configured error responses still return the user's JSON.

```json
{
  "error": {
    "code": "ENDPOINT_NOT_FOUND",
    "message": "No active mock endpoint matches this request."
  }
}
```

| Status | Code                  | Meaning                                                                      |
| ------ | --------------------- | ---------------------------------------------------------------------------- |
| 400    | `INVALID_REQUEST`     | Invalid slug, path, or preflight fields                                      |
| 404    | `ENDPOINT_NOT_FOUND`  | Unknown project/path or inactive requested endpoint                          |
| 405    | `METHOD_NOT_ALLOWED`  | Active path without the requested method; includes `Allow`                   |
| 414    | `URI_TOO_LONG`        | Path exceeds 200 characters or query exceeds 8,192 characters, including `?` |
| 503    | `SERVICE_UNAVAILABLE` | Missing configuration, failed/timed-out lookup, or invalid stored response   |

Provider errors, stack traces, and credentials are not returned to API callers.

## Request history

Activity and endpoint detail pages show newest-first history in 12-record pages. The Activity filter lists 50 recently updated endpoints plus the current selection; any endpoint's detail page links directly to its full history. Use Refresh to load new records; there is no polling or realtime subscription.

Logs record exact configured-method calls, including configured error statuses, bodyless responses, and disabled-endpoint 404s. A runtime error after resolving an endpoint can produce a 503 record. Unknown projects/paths, invalid requests, wrong methods, HEAD, and OPTIONS are not assigned to another endpoint and are not logged.

Each record contains:

- Endpoint ID and actual request method.
- Canonical full mock path, without the host or query string.
- Response status and received UTC timestamp.
- Response-preparation duration, including lookup but excluding network delivery and logging.
- A small set of validated query values.

Path, method, and status are snapshots; editing the endpoint does not rewrite earlier records. Reads use authenticated clients with ownership filters and RLS. Browser clients cannot insert, update, or delete logs, including their own.

### Privacy

Headers, cookies, authorization values, IP addresses, user agents, and request/response bodies are not stored. Only these lowercase query parameters are retained, as strings:

| Parameter                 | Accepted values                                  |
| ------------------------- | ------------------------------------------------ |
| `page`, `limit`, `offset` | Integers from 0–9,999,999, without leading zeros |
| `order`                   | `asc` or `desc`                                  |

Duplicate keys, unsupported parameters, malformed values, and all free-form query values are omitted. For example, `?page=2&limit=20&token=secret&category=books` stores only `{"page":"2","limit":"20"}`. Retained metadata stays below 128 bytes; the database also enforces an 8 KiB limit.

Do not put sensitive values in the retained parameters or configured endpoint paths. Hosting/proxy access logs are separate and may capture URLs; review their privacy settings.

### Reliability and retention

Writes run through Next.js `after` with a three-second timeout. Logging failures emit a constant diagnostic and never replace the configured response. Deleting an endpoint before a pending insert completes can safely reject that insert through the foreign key.

Logging is best-effort: there is no retry queue or delivery guarantee. Counts represent recorded calls, not total network traffic. Deleting users, projects, or endpoints cascades their related logs. Otherwise, logs remain until an operator applies a retention policy.
