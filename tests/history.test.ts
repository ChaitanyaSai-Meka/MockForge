import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/management", async (original) => ({
  ...(await original<typeof import("@/lib/management")>()),
  managementContext: mocks.context,
}));
import {
  getHistoryEndpoint,
  getHistoryFilters,
  getRequestHistory,
  getRequestLog,
} from "@/lib/history";

const id = "df6f6b54-ae83-4ba2-bb68-084d70981a21";
function setup(
  result: { data: unknown; error: unknown; count?: number } = {
    data: [],
    error: null,
    count: 0,
  },
) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  const from = vi.fn(() => query);
  mocks.context.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from },
  });
  return { query, from };
}
beforeEach(() => {
  setup();
});

it("uses authenticated ownership filters and bounded deterministic pagination", async () => {
  const { query, from } = setup();
  await getRequestHistory(id, "2");
  expect(mocks.context).toHaveBeenCalled();
  expect(from).toHaveBeenCalledWith("request_logs");
  expect(query.eq).toHaveBeenCalledWith(
    "mock_endpoints.mock_projects.owner_id",
    "owner",
  );
  expect(query.eq).toHaveBeenCalledWith("endpoint_id", id);
  expect(query.range).toHaveBeenCalledWith(12, 23);
  expect(query.order.mock.calls).toEqual([
    ["created_at", { ascending: false }],
    ["id", { ascending: false }],
  ]);
});
it.each(["-1", "Infinity", "100001", ["1", "2"]].map((page) => ({ page })))(
  "defaults invalid page %j safely",
  async ({ page }) => {
    const { query } = setup();
    await getRequestHistory(undefined, page);
    expect(query.range).toHaveBeenCalledWith(0, 11);
  },
);
it("validates the endpoint filter without widening to all records", async () => {
  const { from } = setup();
  await expect(getRequestHistory("bad-id")).rejects.toThrow("NOT_FOUND");
  expect(from).not.toHaveBeenCalled();
});
it("bounds the endpoint picker and scopes it to the owner", async () => {
  const { query } = setup();
  await getHistoryFilters();
  expect(query.limit).toHaveBeenCalledWith(50);
  expect(query.eq).toHaveBeenCalledWith("mock_projects.owner_id", "owner");
});
it.each([getRequestLog, getHistoryEndpoint])(
  "returns unavailable for missing or foreign detail rows",
  async (read) => {
    setup({ data: null, error: null });
    await expect(read(id)).rejects.toThrow("NOT_FOUND");
  },
);
it("scopes individual request details explicitly by owner", async () => {
  const { query } = setup({ data: { id }, error: null });
  expect(await getRequestLog(id)).toEqual({ id });
  expect(query.eq).toHaveBeenCalledWith("id", id);
  expect(query.eq).toHaveBeenCalledWith(
    "mock_endpoints.mock_projects.owner_id",
    "owner",
  );
});
it.each([
  getRequestLog,
  getHistoryEndpoint,
  getHistoryFilters,
  getRequestHistory,
])("does not expose provider errors", async (read) => {
  setup({ data: null, error: { message: "secret detail" } });
  await expect(read(id)).rejects.not.toThrow("secret detail");
});
