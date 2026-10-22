import { describe, expect, it, vi } from "vitest";
import {
  recordRequest,
  requestDuration,
  safeQueryParams,
  type RequestLogInput,
} from "@/lib/mock/logging";

const entry: RequestLogInput = {
  endpoint_id: "endpoint",
  method: "GET",
  requested_path: "/mock/demo/products",
  status_code: 200,
  duration_ms: 12,
  query_params: {},
};

describe("minimal query metadata", () => {
  it("retains only typed pagination and direction fields", () => {
    expect(
      safeQueryParams(
        "https://example.com/mock/demo?page=2&limit=20&offset=0&order=desc&category=books",
      ),
    ).toEqual({ page: "2", limit: "20", offset: "0", order: "desc" });
  });
  it("omits secrets regardless of their parameter name", () => {
    expect(
      safeQueryParams(
        "https://example.com/mock/demo?token=private&API_KEY=private&password=private&email=a%40example.com&unknown=private&page=private&order=private&__proto__=private",
      ),
    ).toEqual({});
  });
  it.each([
    "page=1&page=2",
    "limit=-1",
    "offset=10000000",
    "page=1e3",
    "page=01",
    "page=%00",
    "order=ASC",
    "order=asc&order=desc",
    "page[]=2",
    "PAGE=2",
  ])("omits malformed/duplicate query %s", (query) => {
    expect(safeQueryParams(`https://example.com/mock/demo?${query}`)).toEqual(
      {},
    );
  });
  it("bounds stored data far below the 8 KiB database limit", () => {
    const query = new URLSearchParams({
      page: "9999999",
      limit: "9999999",
      offset: "9999999",
      order: "desc",
      secret: "x".repeat(7000),
    });
    expect(
      new TextEncoder().encode(
        JSON.stringify(safeQueryParams(`https://example.com/?${query}`)),
      ).length,
    ).toBeLessThan(128);
  });
});

describe("request timing", () => {
  it.each([
    [10, 22.5, 13],
    [10, 9, 0],
    [0, 4_000_000, 3_600_000],
    [0, Infinity, 0],
    [0, NaN, 0],
  ])("bounds %s → %s to %s ms", (start, end, expected) => {
    expect(requestDuration(start, end)).toBe(expected);
  });
});

describe("best-effort logging", () => {
  it("schedules the write instead of blocking the response", async () => {
    const tasks: Array<() => Promise<void>> = [];
    const write = vi.fn().mockResolvedValue(undefined);
    await recordRequest(write, entry, (task) => {
      tasks.push(task);
    });
    expect(write).not.toHaveBeenCalled();
    await tasks[0]();
    expect(write).toHaveBeenCalledExactlyOnceWith(entry);
  });
  it("swallows rejected writes and reports no provider/request data", async () => {
    const report = vi.fn();
    await recordRequest(
      vi.fn().mockRejectedValue(new Error("secret provider detail")),
      entry,
      undefined,
      report,
    );
    expect(report).toHaveBeenCalledExactlyOnceWith();
  });
  it("contains scheduler and diagnostic failures", async () => {
    await expect(
      recordRequest(
        vi.fn(),
        entry,
        () => {
          throw new Error("schedule failed");
        },
        () => {
          throw new Error("diagnostic failed");
        },
      ),
    ).resolves.toBeUndefined();
  });
});
