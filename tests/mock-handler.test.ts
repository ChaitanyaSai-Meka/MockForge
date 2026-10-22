import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockHandler, type RuntimeEndpoint } from "@/lib/mock/handler";
import type { Json } from "@/lib/database.types";

const configured: RuntimeEndpoint = {
  id: "endpoint-private-id",
  method: "GET",
  status_code: 200,
  response_body: { products: [{ id: 1, name: "Keyboard" }] },
  is_active: true,
};
const store = {
  findProject: vi.fn(),
  findEndpoints: vi.fn(),
  insertLog: vi.fn(),
};
const createStore = vi.fn(() => store);
const reportFailure = vi.fn();
const handler = createMockHandler(createStore, reportFailure);

function call(
  method = "GET",
  path = "/mock/demo/products",
  headers?: Record<string, string>,
  body?: string,
) {
  const url = new URL(path, "https://example.com");
  const segments =
    url.pathname === "/mock"
      ? undefined
      : url.pathname.slice("/mock/".length).split("/").map(decodeURIComponent);
  return handler(new Request(url, { method, headers, body }), {
    params: Promise.resolve({ segments }),
  });
}

beforeEach(() => {
  store.insertLog.mockResolvedValue(undefined);
  store.findProject.mockResolvedValue({ id: "project-private-id" });
  store.findEndpoints.mockResolvedValue([configured]);
});

describe("configured responses", () => {
  it("resolves an exact path and returns only its JSON", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, private_metadata: "never expose this" },
    ]);
    const response = await call("GET", "/mock/demo/products?category=books");
    expect(store.findProject).toHaveBeenCalledWith("demo");
    expect(store.findEndpoints).toHaveBeenCalledWith(
      "project-private-id",
      "/products",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await response.json()).toEqual(configured.response_body);
  });
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
    "returns the response configured for %s",
    async (method) => {
      store.findEndpoints.mockResolvedValue([
        { ...configured, method, status_code: 201, response_body: { method } },
      ]);
      const response = await call(method);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ method });
    },
  );
  it.each(
    [null, false, 0, "hello", [], { error: "user-configured response" }].map(
      (value) => ({ value }),
    ),
  )(
    "returns a JSON value without wrapping it (%j)",
    async ({ value: response_body }) => {
      store.findEndpoints.mockResolvedValue([
        { ...configured, status_code: 422, response_body },
      ]);
      const response = await call();
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual(response_body);
    },
  );
  it.each([204, 205, 304])(
    "omits the body for HTTP %s",
    async (status_code) => {
      store.findEndpoints.mockResolvedValue([{ ...configured, status_code }]);
      const response = await call();
      expect(response.status).toBe(status_code);
      expect(await response.text()).toBe("");
      expect(response.headers.get("content-type")).toBeNull();
    },
  );
  it("never derives the response from request headers or payload", async () => {
    store.findEndpoints.mockResolvedValue([{ ...configured, method: "POST" }]);
    const response = await call(
      "POST",
      "/mock/demo/products",
      {
        authorization: "Bearer private",
        cookie: "session=private",
        "content-type": "text/plain",
      },
      "not even JSON",
    );
    expect(await response.json()).toEqual(configured.response_body);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("performs new lookups for edits rather than caching responses", async () => {
    store.findEndpoints
      .mockResolvedValueOnce([configured])
      .mockResolvedValueOnce([
        { ...configured, status_code: 202, response_body: ["changed"] },
      ]);
    expect((await call()).status).toBe(200);
    const updated = await call();
    expect(updated.status).toBe(202);
    expect(await updated.json()).toEqual(["changed"]);
    expect(createStore).toHaveBeenCalledTimes(2);
    expect(store.findProject).toHaveBeenCalledTimes(2);
  });
  it("marks successful responses uncacheable at browser and CDN layers", async () => {
    const response = await call();
    for (const header of [
      "cache-control",
      "cdn-cache-control",
      "vercel-cdn-cache-control",
    ])
      expect(response.headers.get(header)).toContain("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("missing endpoints and methods", () => {
  it("returns a safe 404 for an unknown project without querying endpoints", async () => {
    store.findProject.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "ENDPOINT_NOT_FOUND" },
    });
    expect(store.findEndpoints).not.toHaveBeenCalled();
  });
  it.each([{ rows: [] }, { rows: [{ ...configured, is_active: false }] }])(
    "returns 404 when no active endpoint exists",
    async ({ rows }) => {
      store.findEndpoints.mockResolvedValue(rows);
      const response = await call();
      expect(response.status).toBe(404);
      expect(response.headers.get("allow")).toBeNull();
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    },
  );
  it("keeps an inactive method hidden when another method on the path is active", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, is_active: false },
      { ...configured, method: "POST" },
    ]);
    expect((await call()).status).toBe(404);
  });
  it("returns 405 and only active methods in a deterministic Allow header", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, method: "DELETE" },
      configured,
      { ...configured, method: "PUT", is_active: false },
    ]);
    const response = await call("PATCH");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, DELETE, OPTIONS");
    expect(await response.json()).toMatchObject({
      error: { code: "METHOD_NOT_ALLOWED" },
    });
    expect(response.headers.get("access-control-expose-headers")).toBe("Allow");
  });
  it("does not fall back from HEAD to GET", async () => {
    const response = await call("HEAD");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
    expect(await response.text()).toBe("");
  });
  it("returns a bodyless 404 for HEAD at an unknown path", async () => {
    store.findEndpoints.mockResolvedValue([]);
    const response = await call("HEAD");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
  it("handles a missing slug and invalid encoded paths without database access", async () => {
    expect((await call("GET", "/mock")).status).toBe(400);
    expect((await call("GET", "/mock/demo/products%2Fprivate")).status).toBe(
      400,
    );
    expect(createStore).not.toHaveBeenCalled();
  });
  it("returns JSON 414 for oversized queries", async () => {
    const response = await call(
      "GET",
      `/mock/demo/products?token=${"x".repeat(8192)}`,
    );
    expect(response.status).toBe(414);
    expect(await response.json()).toMatchObject({
      error: { code: "URI_TOO_LONG" },
    });
    expect(createStore).not.toHaveBeenCalled();
  });
});

describe("CORS preflight", () => {
  it("allows browser requests with JSON, authorization, and custom headers", async () => {
    store.findEndpoints.mockResolvedValue([
      configured,
      { ...configured, method: "POST" },
    ]);
    const response = await call("OPTIONS", "/mock/demo/products", {
      origin: "https://frontend.example",
      "access-control-request-method": "POST",
      "access-control-request-headers":
        "Content-Type, Authorization, X-App-Key",
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, POST, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "content-type, authorization, x-app-key",
    );
    expect(response.headers.get("access-control-max-age")).toBe("0");
    expect(response.headers.get("vary")).toContain(
      "Access-Control-Request-Headers",
    );
  });
  it("supports plain OPTIONS and preflighting OPTIONS itself", async () => {
    expect((await call("OPTIONS")).status).toBe(204);
    expect(
      (
        await call("OPTIONS", "/mock/demo/products", {
          "access-control-request-method": "OPTIONS",
        })
      ).status,
    ).toBe(204);
  });
  it("rejects a preflight for an unconfigured method with Allow", async () => {
    const response = await call("OPTIONS", "/mock/demo/products", {
      "access-control-request-method": "PUT",
    });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });
  it("does not advertise inactive paths or methods", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, is_active: false },
      { ...configured, method: "POST" },
    ]);
    expect(
      (
        await call("OPTIONS", "/mock/demo/products", {
          "access-control-request-method": "GET",
        })
      ).status,
    ).toBe(404);
    store.findEndpoints.mockResolvedValue([]);
    expect((await call("OPTIONS")).status).toBe(404);
  });
  it("rejects malformed preflight headers before accessing the database", async () => {
    const response = await call("OPTIONS", "/mock/demo/products", {
      "access-control-request-headers": "invalid header",
    });
    expect(response.status).toBe(400);
    expect(createStore).not.toHaveBeenCalled();
  });
  it("rejects malformed preflight methods", async () => {
    expect(
      (
        await call("OPTIONS", "/mock/demo/products", {
          "access-control-request-method": "get post",
        })
      ).status,
    ).toBe(400);
  });
});

describe("runtime failure handling", () => {
  it("handles missing server configuration safely", async () => {
    createStore.mockImplementationOnce(() => {
      throw new Error("private environment detail");
    });
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private environment detail");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(reportFailure).toHaveBeenCalledWith();
  });
  it.each(["findProject", "findEndpoints"] as const)(
    "handles %s failures and timeouts without leaking database errors",
    async (lookup) => {
      store[lookup].mockRejectedValue(new Error("sensitive database details"));
      const response = await call();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: {
          code: "SERVICE_UNAVAILABLE",
          message:
            "Mock responses are temporarily unavailable. Please try again.",
        },
      });
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(reportFailure).toHaveBeenCalledOnce();
    },
  );
  it.each([100, 200.5, 600])(
    "handles corrupt status %s safely",
    async (status_code) => {
      store.findEndpoints.mockResolvedValue([{ ...configured, status_code }]);
      expect((await call()).status).toBe(503);
    },
  );
  it("handles an unserializable configuration safely", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, response_body: undefined as unknown as Json },
    ]);
    expect((await call()).status).toBe(503);
  });
});

describe("request history integration", () => {
  it("records the configured response metadata but not incoming secrets", async () => {
    await call(
      "GET",
      "/mock/demo/products/?page=2&token=secret&anything=secret",
      { authorization: "Bearer secret", cookie: "secret" },
    );
    expect(store.insertLog).toHaveBeenCalledOnce();
    const entry = store.insertLog.mock.calls[0][0];
    expect(entry).toEqual({
      endpoint_id: configured.id,
      method: "GET",
      requested_path: "/mock/demo/products",
      query_params: { page: "2" },
      status_code: 200,
      duration_ms: expect.any(Number),
      created_at: expect.any(String),
    });
    expect(entry.duration_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(entry.created_at))).toBe(false);
    expect(JSON.stringify(entry)).not.toContain("secret");
  });
  it.each([204, 205, 304, 422, 599])(
    "records configured HTTP %s",
    async (status_code) => {
      store.findEndpoints.mockResolvedValue([{ ...configured, status_code }]);
      expect((await call()).status).toBe(status_code);
      expect(store.insertLog).toHaveBeenCalledWith(
        expect.objectContaining({ status_code }),
      );
    },
  );
  it("records a matched inactive endpoint's 404", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, is_active: false },
    ]);
    expect((await call()).status).toBe(404);
    expect(store.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint_id: configured.id, status_code: 404 }),
    );
  });
  it("records a resolved endpoint's runtime error as 503", async () => {
    store.findEndpoints.mockResolvedValue([
      { ...configured, status_code: 100 },
    ]);
    expect((await call()).status).toBe(503);
    expect(store.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: 503 }),
    );
  });
  it("does not attribute preflights or unsupported methods to another endpoint", async () => {
    await call("OPTIONS");
    await call("HEAD");
    await call("POST");
    expect(store.insertLog).not.toHaveBeenCalled();
  });
  it("does not log unknown projects or paths", async () => {
    store.findProject.mockResolvedValueOnce(null);
    await call();
    store.findEndpoints.mockResolvedValueOnce([]);
    await call();
    expect(store.insertLog).not.toHaveBeenCalled();
  });
  it("returns the valid response unchanged when inserting the log fails", async () => {
    store.insertLog.mockRejectedValueOnce(new Error("private database detail"));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(configured.response_body);
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      "MockForge request logging failed.",
    );
  });
});
