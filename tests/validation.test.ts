import { describe, expect, it } from "vitest";
import {
  buildMockUrl,
  endpointSchema,
  hasResponseBody,
  parseJsonResponse,
  pathSchema,
  projectSchema,
  suggestSlug,
} from "@/lib/validation";

const endpoint = {
  method: "GET",
  path: "/products",
  status_code: "200",
  response_body: '{"products":[]}',
  is_active: true,
};

describe("project validation", () => {
  it("trims names and converts an empty description to null", () => {
    expect(
      projectSchema.parse({
        name: " Storefront ",
        slug: "storefront",
        description: "  ",
      }),
    ).toEqual({ name: "Storefront", slug: "storefront", description: null });
  });
  it.each([
    "UPPER",
    "ab",
    "-leading",
    "trailing-",
    "double--dash",
    "has space",
    "a/b",
  ])("rejects slug %s", (slug) => {
    expect(
      projectSchema.safeParse({ name: "Project", slug, description: "" })
        .success,
    ).toBe(false);
  });
  it("rejects a blank name and overlong description", () => {
    expect(
      projectSchema.safeParse({
        name: "  ",
        slug: "valid",
        description: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
  it("suggests a URL-safe slug within the maximum length", () => {
    expect(suggestSlug("My Storefront API!")).toBe("my-storefront-api");
    expect(suggestSlug("x".repeat(80))).toHaveLength(63);
  });
});

describe("exact endpoint paths", () => {
  it.each([
    ["/", "/"],
    [" /Products//latest/ ", "/Products/latest"],
    ["/v1/items-2_3.json", "/v1/items-2_3.json"],
  ])("normalizes %s", (input, expected) => {
    expect(pathSchema.parse(input)).toBe(expected);
  });
  it.each([
    "",
    "products",
    "/products?sort=id",
    "/users#me",
    "/../users",
    "/users/./me",
    "/%2e%2e",
    "/users/:id",
    "/users/*",
    "/a\\b",
    "/white space",
    "/" + "x".repeat(200),
  ])("rejects %s", (path) => {
    expect(pathSchema.safeParse(path).success).toBe(false);
  });
  it("generates deployment URLs, including the project root", () => {
    expect(buildMockUrl("https://example.com/", "store", "/products")).toBe(
      "https://example.com/mock/store/products",
    );
    expect(buildMockUrl("http://localhost:3000", "store", "/")).toBe(
      "http://localhost:3000/mock/store",
    );
  });
});

describe("JSONB-compatible responses", () => {
  it.each(['{"ok":true}', '[1,"two"]', '"hello"', "null", "false", "12.5"])(
    "accepts %s",
    (input) => {
      expect(parseJsonResponse(input)).toEqual({
        success: true,
        value: JSON.parse(input),
      });
    },
  );
  it.each([
    "",
    "{bad}",
    '{"a":1,}',
    "undefined",
    "1e400",
    "9007199254740993",
    '"\\u0000"',
    '{"\\u0000":true}',
    '"\\ud800"',
  ])("rejects unsupported JSON %s", (input) => {
    expect(parseJsonResponse(input).success).toBe(false);
  });
  it("limits byte size rather than character count", () => {
    expect(parseJsonResponse(JSON.stringify("é".repeat(32768))).success).toBe(
      false,
    );
  });
  it("accounts for JSONB serialization overhead", () => {
    const text = JSON.stringify(Array(30_000).fill(0));
    expect(text.length).toBeLessThan(65_536);
    expect(parseJsonResponse(text).success).toBe(false);
  });
  it("bounds nesting without throwing a stack overflow", () => {
    expect(
      parseJsonResponse("[".repeat(70) + "0" + "]".repeat(70)).success,
    ).toBe(false);
  });
});

describe("endpoint configurations", () => {
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
    "supports %s",
    (method) => {
      expect(endpointSchema.parse({ ...endpoint, method })).toMatchObject({
        method,
        status_code: 200,
        response_body: { products: [] },
      });
    },
  );
  it.each(["HEAD", "OPTIONS", "get"])(
    "rejects unsupported configured method %s",
    (method) => {
      expect(endpointSchema.safeParse({ ...endpoint, method }).success).toBe(
        false,
      );
    },
  );
  it.each(["100", "199", "600", "200.5", "", "0xC8"])(
    "rejects status %s",
    (status_code) => {
      expect(
        endpointSchema.safeParse({ ...endpoint, status_code }).success,
      ).toBe(false);
    },
  );
  it.each([204, 205, 304])("identifies the no-body status %s", (status) => {
    expect(hasResponseBody(status)).toBe(false);
    expect(
      endpointSchema.safeParse({ ...endpoint, status_code: String(status) })
        .success,
    ).toBe(true);
  });
});
