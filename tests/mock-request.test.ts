import { describe, expect, it } from "vitest";
import { preflightHeaders, resolveMockTarget } from "@/lib/mock/request";

describe("mock request paths", () => {
  it("matches the project root", () => {
    expect(
      resolveMockTarget("https://example.com/mock/demo", ["demo"]),
    ).toEqual({ target: { slug: "demo", path: "/" } });
  });
  it("ignores query strings and preserves path case", () => {
    expect(
      resolveMockTarget(
        "https://example.com/mock/demo/Products?category=books",
        ["demo", "Products"],
      ),
    ).toEqual({ target: { slug: "demo", path: "/Products" } });
  });
  it("normalizes trailing and repeated slash segments", () => {
    expect(
      resolveMockTarget("https://example.com/mock/demo/products//latest/", [
        "demo",
        "products",
        "",
        "latest",
        "",
      ]),
    ).toEqual({ target: { slug: "demo", path: "/products/latest" } });
  });
  it.each(
    [
      undefined,
      [],
      ["a"],
      ["UPPER"],
      ["bad_slug"],
      ["trailing-"],
      ["x".repeat(64)],
    ].map((segments) => ({ segments })),
  )("rejects a missing or invalid project slug (%j)", ({ segments }) => {
    expect(
      resolveMockTarget("https://example.com/mock", segments),
    ).toMatchObject({ error: { status: 400, code: "INVALID_REQUEST" } });
  });
  it.each([
    ["/products%2Fprivate", ["demo", "products/private"]],
    ["/%70roducts", ["demo", "products"]],
    ["/%00", ["demo", "\0"]],
    ["/%ZZ", ["demo", "%ZZ"]],
  ] as const)("rejects encoded or malformed path %s", (path, segments) => {
    expect(
      resolveMockTarget(`https://example.com/mock/demo${path}`, [...segments]),
    ).toMatchObject({ error: { status: 400 } });
  });
  it.each([".", "..", "*", ":id"])(
    "rejects nonliteral segment %s",
    (segment) => {
      expect(
        resolveMockTarget("https://example.com/mock/demo/products", [
          "demo",
          segment,
        ]),
      ).toMatchObject({ error: { status: 400 } });
    },
  );
  it("bounds path and query lengths", () => {
    expect(
      resolveMockTarget("https://example.com/mock/demo", [
        "demo",
        "x".repeat(200),
      ]),
    ).toMatchObject({ error: { status: 414 } });
    expect(
      resolveMockTarget(`https://example.com/mock/demo?q=${"x".repeat(8192)}`, [
        "demo",
      ]),
    ).toMatchObject({ error: { status: 414 } });
  });
});

describe("CORS request header validation", () => {
  it("allows explicit authorization and custom header names", () => {
    expect(
      preflightHeaders("Content-Type, Authorization, X-App-Key, CONTENT-TYPE"),
    ).toEqual(["content-type", "authorization", "x-app-key"]);
  });
  it.each([null, ""])("accepts absent header names (%s)", (value) => {
    expect(preflightHeaders(value)).toEqual([]);
  });
  it.each([
    "x-test,,x-other",
    "bad header",
    "x-test: value",
    "x-test\r\nx-other",
    "x".repeat(2049),
    Array(33).fill("x-header").join(","),
  ])("rejects malformed or excessive header lists", (value) => {
    expect(preflightHeaders(value)).toBeNull();
  });
});
