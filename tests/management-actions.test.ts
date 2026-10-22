import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from "@/app/dashboard/projects/actions";
import {
  createEndpointAction,
  updateEndpointAction,
  toggleEndpointAction,
  deleteEndpointAction,
} from "@/app/dashboard/projects/[projectId]/endpoints/actions";

const projectId = "10000000-0000-4000-8000-000000000001";
const endpointId = "20000000-0000-4000-8000-000000000001";
const idle = { status: "idle" as const };
const ownedProject = {
  id: projectId,
  owner_id: "verified-user",
  slug: "storefront",
};
type Result = {
  data: unknown;
  error: null | { code: string; message?: string };
};
type Query = {
  table: string;
  operation?: string;
  values?: unknown;
  filters: Record<string, unknown>;
};
let results: Result[];
let queries: Query[];

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
function projectForm() {
  return form({
    name: "Storefront",
    slug: "storefront",
    description: "",
    owner_id: "forged-owner",
  });
}
function endpointForm() {
  return form({
    method: "GET",
    path: "/products//",
    status_code: "200",
    response_body: '{"ok":true}',
    is_active: "on",
    project_id: "forged-project",
  });
}

beforeEach(() => {
  queries = [];
  results = [];
  mocks.requireUser.mockResolvedValue({ id: "verified-user" });
  mocks.createClient.mockResolvedValue({
    from: (table: string) => {
      const query: Query = { table, filters: {} };
      queries.push(query);
      const terminal = async () => {
        const result = results.shift();
        if (!result) throw new Error("Unexpected database query");
        return result;
      };
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          query.operation = "insert";
          query.values = values;
          return builder;
        },
        update: (values: unknown) => {
          query.operation = "update";
          query.values = values;
          return builder;
        },
        delete: () => {
          query.operation = "delete";
          return builder;
        },
        eq: (key: string, value: unknown) => {
          query.filters[key] = value;
          return builder;
        },
        single: terminal,
        maybeSingle: terminal,
      };
      return builder;
    },
  });
});

describe("project writes", () => {
  it("requires authentication before touching the database", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("REDIRECT:/login"));
    await expect(createProjectAction(idle, projectForm())).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(queries).toEqual([]);
  });
  it("assigns ownership from the verified session, ignoring form owner_id", async () => {
    results.push({ data: { id: projectId }, error: null });
    await expect(createProjectAction(idle, projectForm())).rejects.toThrow(
      `REDIRECT:/dashboard/projects/${projectId}?notice=project-created`,
    );
    expect(queries[0].values).toEqual({
      name: "Storefront",
      slug: "storefront",
      description: null,
      owner_id: "verified-user",
    });
  });
  it("returns a slug error for duplicates without exposing database details", async () => {
    results.push({
      data: null,
      error: { code: "23505", message: "private DB details" },
    });
    const state = await createProjectAction(idle, projectForm());
    expect(state.fieldErrors?.slug).toBeDefined();
    expect(JSON.stringify(state)).not.toContain("private DB details");
  });
  it("validates inputs on the server", async () => {
    const data = projectForm();
    data.set("slug", "invalid slug");
    expect(
      (await createProjectAction(idle, data)).fieldErrors?.slug,
    ).toBeDefined();
    expect(queries).toEqual([]);
  });
  it("scopes project updates to the owner and never transfers ownership", async () => {
    results.push({ data: { id: projectId }, error: null });
    await expect(
      updateProjectAction(projectId, idle, projectForm()),
    ).rejects.toThrow("project-updated");
    expect(queries[0].filters).toEqual({
      id: projectId,
      owner_id: "verified-user",
    });
    expect(queries[0].values).not.toHaveProperty("owner_id");
  });
  it("reports a missing or unauthorized update without success feedback", async () => {
    results.push({ data: null, error: null });
    expect(
      await updateProjectAction(projectId, idle, projectForm()),
    ).toMatchObject({ status: "error", message: "Project not found." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("requires the current slug for deletion", async () => {
    results.push({ data: ownedProject, error: null });
    expect(
      await deleteProjectAction(
        projectId,
        idle,
        form({ confirmation: "wrong" }),
      ),
    ).toMatchObject({ status: "error" });
    expect(queries.some((query) => query.operation === "delete")).toBe(false);
  });
  it("deletes only the owned, confirmed project", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: { id: projectId }, error: null },
    );
    await expect(
      deleteProjectAction(
        projectId,
        idle,
        form({ confirmation: "storefront" }),
      ),
    ).rejects.toThrow("project-deleted");
    expect(queries[1].filters).toEqual({
      id: projectId,
      owner_id: "verified-user",
      slug: "storefront",
    });
  });
});

describe("endpoint ownership and validation", () => {
  it.each(["create", "update", "toggle", "delete"])(
    "checks the parent project before %s",
    async (operation) => {
      results.push({ data: null, error: null });
      const result =
        operation === "create"
          ? await createEndpointAction(projectId, idle, endpointForm())
          : operation === "update"
            ? await updateEndpointAction(
                projectId,
                endpointId,
                idle,
                endpointForm(),
              )
            : operation === "toggle"
              ? await toggleEndpointAction(
                  projectId,
                  endpointId,
                  idle,
                  form({ is_active: "false" }),
                )
              : await deleteEndpointAction(
                  projectId,
                  endpointId,
                  idle,
                  form({ confirmation: "GET /products" }),
                );
      expect(result).toMatchObject({
        status: "error",
        message: "Project not found.",
      });
      expect(queries).toHaveLength(1);
      expect(queries[0].filters).toEqual({
        id: projectId,
        owner_id: "verified-user",
      });
    },
  );
  it("normalizes paths and ignores a forged project_id in form data", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: { id: endpointId }, error: null },
    );
    await expect(
      createEndpointAction(projectId, idle, endpointForm()),
    ).rejects.toThrow("endpoint-created");
    expect(queries[1].values).toEqual({
      project_id: projectId,
      method: "GET",
      path: "/products",
      status_code: 200,
      response_body: { ok: true },
      is_active: true,
    });
  });
  it("rejects invalid JSON without writing an endpoint", async () => {
    results.push({ data: ownedProject, error: null });
    const data = endpointForm();
    data.set("response_body", "{broken}");
    expect(
      (await createEndpointAction(projectId, idle, data)).fieldErrors
        ?.response_body,
    ).toBeDefined();
    expect(queries).toHaveLength(1);
  });
  it("reports a conflicting normalized method/path", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: null, error: { code: "23505" } },
    );
    expect(
      (await createEndpointAction(projectId, idle, endpointForm())).fieldErrors
        ?.path,
    ).toBeDefined();
  });
  it("does not update an endpoint through the wrong parent project", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: null, error: null },
    );
    expect(
      await updateEndpointAction(projectId, endpointId, idle, endpointForm()),
    ).toMatchObject({ status: "error", message: "Endpoint not found." });
    expect(queries[1].filters).toEqual({
      id: endpointId,
      project_id: projectId,
    });
  });
  it("scopes active toggles to the parent project", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: { id: endpointId }, error: null },
    );
    expect(
      await toggleEndpointAction(
        projectId,
        endpointId,
        idle,
        form({ is_active: "false" }),
      ),
    ).toMatchObject({ status: "success" });
    expect(queries[1].filters).toEqual({
      id: endpointId,
      project_id: projectId,
    });
    expect(queries[1].values).toEqual({ is_active: false });
  });
  it("rejects malformed toggle values", async () => {
    results.push({ data: ownedProject, error: null });
    expect(
      await toggleEndpointAction(
        projectId,
        endpointId,
        idle,
        form({ is_active: "invalid" }),
      ),
    ).toMatchObject({ status: "error" });
    expect(queries).toHaveLength(1);
  });
  it("checks the endpoint confirmation on the server", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: { method: "GET", path: "/products" }, error: null },
    );
    expect(
      await deleteEndpointAction(
        projectId,
        endpointId,
        idle,
        form({ confirmation: "DELETE /products" }),
      ),
    ).toMatchObject({ status: "error" });
    expect(queries.some((query) => query.operation === "delete")).toBe(false);
  });
  it("deletes only the confirmed endpoint in the owned project", async () => {
    results.push(
      { data: ownedProject, error: null },
      { data: { method: "GET", path: "/products" }, error: null },
      { data: { id: endpointId }, error: null },
    );
    await expect(
      deleteEndpointAction(
        projectId,
        endpointId,
        idle,
        form({ confirmation: "GET /products" }),
      ),
    ).rejects.toThrow("endpoint-deleted");
    expect(queries[2].filters).toEqual({
      id: endpointId,
      project_id: projectId,
      method: "GET",
      path: "/products",
    });
  });
});
