import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { createRuntimeStore } from "@/lib/mock/store";

function query(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return builder;
}

beforeEach(() => {
  mocks.createAdminClient.mockReset();
});

it("reads a project by exact slug and only selects its ID", async () => {
  const builder = query({ data: { id: "project-id" }, error: null });
  const from = vi.fn().mockReturnValue(builder);
  mocks.createAdminClient.mockReturnValue({ from });
  expect(await createRuntimeStore().findProject("demo")).toEqual({
    id: "project-id",
  });
  expect(from).toHaveBeenCalledWith("mock_projects");
  expect(builder.select).toHaveBeenCalledWith("id");
  expect(builder.eq).toHaveBeenCalledWith("slug", "demo");
  expect(builder.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
});

it("scopes endpoint lookups to the project and exact path with a bounded result", async () => {
  const builder = query({ data: [], error: null });
  mocks.createAdminClient.mockReturnValue({
    from: vi.fn().mockReturnValue(builder),
  });
  expect(
    await createRuntimeStore().findEndpoints("project-id", "/products"),
  ).toEqual([]);
  expect(builder.eq).toHaveBeenNthCalledWith(1, "project_id", "project-id");
  expect(builder.eq).toHaveBeenNthCalledWith(2, "path", "/products");
  expect(builder.limit).toHaveBeenCalledWith(5);
  expect(builder.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
});

it("turns database failures into safe exceptions, not missing endpoints", async () => {
  const builder = query({
    data: null,
    error: { message: "sensitive provider details" },
  });
  mocks.createAdminClient.mockReturnValue({
    from: vi.fn().mockReturnValue(builder),
  });
  const store = createRuntimeStore();
  await expect(store.findProject("demo")).rejects.toThrow(
    "Project lookup unavailable.",
  );
  await expect(store.findEndpoints("project-id", "/products")).rejects.toThrow(
    "Endpoint lookup unavailable.",
  );
});
