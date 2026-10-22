import type { Endpoint } from "@/lib/database.types";
import { hasResponseBody, HTTP_METHODS } from "@/lib/validation";
import { preflightHeaders, resolveMockTarget } from "@/lib/mock/request";
import {
  recordRequest,
  requestDuration,
  safeQueryParams,
  type LogScheduler,
  type RequestLogInput,
} from "@/lib/mock/logging";

export type RuntimeEndpoint = Pick<
  Endpoint,
  "id" | "method" | "status_code" | "response_body" | "is_active"
>;

export type RuntimeStore = {
  insertLog: (entry: RequestLogInput) => Promise<void>;
  findProject: (slug: string) => Promise<{ id: string } | null>;
  findEndpoints: (
    projectId: string,
    path: string,
  ) => Promise<RuntimeEndpoint[]>;
};

export type MockRouteContext = { params: Promise<{ segments?: string[] }> };

function responseHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Allow",
    "Cache-Control": "no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
}

function jsonError(
  request: Request,
  status: number,
  code: string,
  message: string,
  headers: Headers,
) {
  headers.set("Content-Type", "application/json; charset=utf-8");
  // HEAD uses the same status/headers as other errors, but cannot carry a body.
  const body =
    request.method === "HEAD"
      ? null
      : JSON.stringify({ error: { code, message } });
  return new Response(body, { status, headers });
}

function notFound(request: Request, headers: Headers) {
  return jsonError(
    request,
    404,
    "ENDPOINT_NOT_FOUND",
    "No active mock endpoint matches this request.",
    headers,
  );
}

function methodNotAllowed(
  request: Request,
  methods: string[],
  headers: Headers,
) {
  headers.set("Allow", [...methods, "OPTIONS"].join(", "));
  return jsonError(
    request,
    405,
    "METHOD_NOT_ALLOWED",
    "This method is not available for this endpoint.",
    headers,
  );
}

export function createMockHandler(
  createStore: () => RuntimeStore,
  reportFailure: () => void = () =>
    console.error("MockForge runtime lookup failed."),
  scheduleLog?: LogScheduler,
) {
  return async function handleMockRequest(
    request: Request,
    context: MockRouteContext,
  ): Promise<Response> {
    const headers = responseHeaders();
    const started = performance.now();
    const createdAt = new Date().toISOString();
    let recording:
      { store: RuntimeStore; endpointId: string; path: string } | undefined;
    let responseStatus = 503;
    const respond = (response: Response) => {
      responseStatus = response.status;
      return response;
    };
    if (request.method === "OPTIONS") {
      headers.set(
        "Vary",
        "Access-Control-Request-Method, Access-Control-Request-Headers",
      );
    }

    try {
      const { segments } = await context.params;
      const resolved = resolveMockTarget(request.url, segments);
      if (resolved.error) {
        const { status, code, message } = resolved.error;
        return jsonError(request, status, code, message, headers);
      }

      const requestedHeaders =
        request.method === "OPTIONS"
          ? preflightHeaders(
              request.headers.get("access-control-request-headers"),
            )
          : [];
      if (requestedHeaders === null) {
        return jsonError(
          request,
          400,
          "INVALID_REQUEST",
          "Invalid or excessive CORS request headers.",
          headers,
        );
      }

      const store = createStore();
      const project = await store.findProject(resolved.target.slug);
      if (!project) return notFound(request, headers);

      // There are at most five rows for one path (unique project/method/path).
      // Read the method availability and response together to avoid resolving
      // one configuration and returning a different one during an edit.
      const endpoints = await store.findEndpoints(
        project.id,
        resolved.target.path,
      );
      const endpoint = endpoints.find(
        (candidate) => candidate.method === request.method,
      );
      if (endpoint)
        recording = {
          store,
          endpointId: endpoint.id,
          path: `/mock/${resolved.target.slug}${resolved.target.path === "/" ? "" : resolved.target.path}`,
        };
      const methods = HTTP_METHODS.filter((method) =>
        endpoints.some(
          (endpoint) => endpoint.method === method && endpoint.is_active,
        ),
      );
      if (methods.length === 0) return respond(notFound(request, headers));

      if (request.method === "OPTIONS") {
        const requestedMethod = request.headers.get(
          "access-control-request-method",
        );
        if (requestedMethod) {
          if (!/^[A-Z]{1,16}$/.test(requestedMethod)) {
            return jsonError(
              request,
              400,
              "INVALID_REQUEST",
              "Invalid CORS request method.",
              headers,
            );
          }
          if (requestedMethod !== "OPTIONS") {
            const requestedEndpoint = endpoints.find(
              (endpoint) => endpoint.method === requestedMethod,
            );
            if (requestedEndpoint && !requestedEndpoint.is_active)
              return notFound(request, headers);
            if (!methods.some((method) => method === requestedMethod))
              return methodNotAllowed(request, methods, headers);
          }
        }
        headers.set("Allow", [...methods, "OPTIONS"].join(", "));
        headers.set(
          "Access-Control-Allow-Methods",
          [...methods, "OPTIONS"].join(", "),
        );
        headers.set("Access-Control-Max-Age", "0");
        if (requestedHeaders.length)
          headers.set(
            "Access-Control-Allow-Headers",
            requestedHeaders.join(", "),
          );
        return new Response(null, { status: 204, headers });
      }

      if (!endpoint) return methodNotAllowed(request, methods, headers);
      if (!endpoint.is_active) return respond(notFound(request, headers));
      if (
        !Number.isInteger(endpoint.status_code) ||
        endpoint.status_code < 200 ||
        endpoint.status_code > 599
      ) {
        throw new Error("Invalid stored response status.");
      }

      if (!hasResponseBody(endpoint.status_code)) {
        return respond(
          new Response(null, { status: endpoint.status_code, headers }),
        );
      }
      headers.set("Content-Type", "application/json; charset=utf-8");
      return respond(
        Response.json(endpoint.response_body, {
          status: endpoint.status_code,
          headers,
        }),
      );
    } catch {
      // Do not emit request URLs, headers, credentials, or provider messages.
      reportFailure();
      return jsonError(
        request,
        503,
        "SERVICE_UNAVAILABLE",
        "Mock responses are temporarily unavailable. Please try again.",
        headers,
      );
    } finally {
      if (recording) {
        await recordRequest(
          recording.store.insertLog,
          {
            endpoint_id: recording.endpointId,
            method: request.method,
            requested_path: recording.path,
            query_params: safeQueryParams(request.url),
            status_code: responseStatus,
            duration_ms: requestDuration(started, performance.now()),
            created_at: createdAt,
          },
          scheduleLog,
        );
      }
    }
  };
}
