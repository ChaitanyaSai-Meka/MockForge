import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "@/app/api/cron/keep-alive/route";

const query = {
  select: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  abortSignal: vi.fn(),
};
const from = vi.fn().mockReturnValue(query);

function request(authorization = "Bearer test-cron-secret") {
  return new Request("https://example.com/api/cron/keep-alive", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mocks.createAdminClient.mockReset().mockReturnValue({ from });
  query.abortSignal.mockReset().mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

it.each(["", "Bearer wrong-secret", "Basic test-cron-secret"])(
  "rejects unauthorized requests before accessing the database: %s",
  async (authorization) => {
    const response = await GET(request(authorization));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  },
);

it("fails closed when the cron secret is missing", async () => {
  vi.stubEnv("CRON_SECRET", "");
  const response = await GET(request("Bearer undefined"));
  expect(response.status).toBe(503);
  expect(mocks.createAdminClient).not.toHaveBeenCalled();
});

it.each([
  { label: "empty table", rows: [] },
  { label: "existing project", rows: [{ id: "private-project-id" }] },
])(
  "checks the database without returning project data ($label)",
  async ({ rows }) => {
    query.abortSignal.mockResolvedValue({ data: rows, error: null });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(from).toHaveBeenCalledWith("mock_projects");
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(query.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  },
);

it.each(["2026-10-30", "2026-12-31", "2028-02-28"])(
  "keeps alternate-day queries across the calendar boundary after %s",
  async (start) => {
    const startTime = Date.parse(`${start}T00:00:00Z`);
    for (let day = 0; day < 5; day++) {
      vi.setSystemTime(startTime + day * 86_400_000);
      const response = await GET(request());
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual(
        day % 2 === 0 ? { ok: true } : { ok: true, skipped: true },
      );
      expect(mocks.createAdminClient).toHaveBeenCalledTimes(
        Math.floor(day / 2) + 1,
      );
    }
  },
);

it.each(["provider", "network", "configuration"])(
  "returns a safe failure for %s errors",
  async (failure) => {
    const error = new Error("sensitive provider details");
    if (failure === "provider") {
      query.abortSignal.mockResolvedValue({ data: null, error });
    } else if (failure === "network") {
      query.abortSignal.mockRejectedValue(error);
    } else {
      mocks.createAdminClient.mockImplementation(() => {
        throw error;
      });
    }
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Database unavailable." });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "MockForge database keep-alive failed.",
    );
  },
);
