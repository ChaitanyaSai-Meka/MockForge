import { randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient<Database>;
};

function settings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !secret)
    throw new Error(
      "Live tests require the Supabase URL, public key, and server key in .env.local.",
    );
  return { url, key, secret };
}

async function createFixtureUsers(count: number) {
  const { url, key, secret } = settings();
  const admin = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users: TestUser[] = [];
  async function cleanup() {
    for (const user of users) {
      // Validate exact fixture ownership before deleting. Never enumerate or
      // remove real users; their projects are outside this test's scope.
      const { data, error } = await admin.auth.admin.getUserById(user.id);
      if (
        error ||
        data.user.email !== user.email ||
        !user.email.startsWith("mockforge-e2e-")
      ) {
        throw new Error("Could not verify a fixture user for cleanup.");
      }
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw new Error("Could not clean up a fixture user.");
    }
  }
  try {
    for (let index = 0; index < count; index++) {
      const email = `mockforge-e2e-${randomUUID()}@example.invalid`;
      const password = randomBytes(24).toString("hex");
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error || !created.data.user)
        throw new Error(
          `Fixture creation failed (${created.error?.code ?? "unknown"}).`,
        );
      const client = createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      users.push({ id: created.data.user.id, email, password, client });
      const signedIn = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (signedIn.error) throw new Error("Fixture login failed.");
    }
    return { users, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}

test("real project and endpoint CRUD, mobile controls, and cross-user isolation", async ({
  page,
  browser,
  context,
}, testInfo) => {
  const {
    users: [owner, other],
    cleanup,
  } = await createFixtureUsers(2);
  const slug = `e2e-${randomUUID().slice(0, 12)}`;
  const renamedSlug = `${slug}-updated`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await login(page, owner);
    await page.getByRole("link", { name: "New project", exact: true }).click();
    await page.getByLabel("Project name").fill("Storefront browser test");
    await page.getByLabel("URL slug").fill(slug);
    await page
      .getByLabel("Description")
      .fill("Temporary automated test project.");
    await page
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    await page.waitForURL(
      /\/dashboard\/projects\/[\da-f-]+\?notice=project-created$/,
    );
    const projectId = new URL(page.url()).pathname.split("/").at(-1)!;
    const projectPath = `/dashboard/projects/${projectId}`;
    const createdProject = await owner.client
      .from("mock_projects")
      .select("*")
      .eq("id", projectId)
      .single();
    expect(createdProject.error).toBeNull();
    expect(createdProject.data?.owner_id).toBe(owner.id);

    await test.step("edit project and reject duplicate slugs", async () => {
      await page
        .getByRole("link", { name: "Edit project", exact: true })
        .click();
      await page.getByLabel("Project name").fill("Updated storefront");
      await page.getByLabel("URL slug").fill(renamedSlug);
      await expect(
        page.getByText("Changing the slug changes every endpoint URL", {
          exact: false,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await page.waitForURL("**?notice=project-updated");
      await expect(
        page.getByRole("heading", { name: "Updated storefront" }),
      ).toBeVisible();
      await page.goto("/dashboard/projects/new");
      await page.getByLabel("Project name").fill("Duplicate test");
      await page.getByLabel("URL slug").fill(renamedSlug);
      await page
        .getByRole("button", { name: "Create project", exact: true })
        .click();
      await expect(page.locator("#slug-error")).toContainText("unavailable");
      await expect(page.getByLabel("Project name")).toHaveValue(
        "Duplicate test",
      );
    });

    await page.goto(`${projectPath}/endpoints/new`);
    await page.getByLabel("JSON response body").fill("{broken}");
    await page
      .getByRole("button", { name: "Create endpoint", exact: true })
      .click();
    await expect(page.locator("#json-error")).toContainText("Invalid JSON");
    const payload = { products: [{ id: 1, name: "Test keyboard" }] };
    await page.getByLabel("Path", { exact: true }).fill("/products//");
    await page.getByLabel("JSON response body").fill(JSON.stringify(payload));
    await page
      .getByRole("button", { name: "Format JSON", exact: true })
      .click();
    await expect(page.locator("#json-feedback")).toContainText("Valid JSON");
    await page
      .getByRole("button", { name: "Create endpoint", exact: true })
      .click();
    await page.waitForURL(/\/endpoints\/[\da-f-]+\?notice=endpoint-created$/);
    const endpointId = new URL(page.url()).pathname.split("/").at(-1)!;
    const endpointPath = `${projectPath}/endpoints/${endpointId}`;
    const saved = await owner.client
      .from("mock_endpoints")
      .select("*")
      .eq("id", endpointId)
      .single();
    expect(saved.error).toBeNull();
    expect(saved.data).toMatchObject({
      method: "GET",
      path: "/products",
      status_code: 200,
      response_body: payload,
      is_active: true,
    });

    await test.step("copy URLs and JSON, then disable and enable", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy URL", exact: true }).click();
      const expectedUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/mock/${renamedSlug}/products`;
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        expectedUrl,
      );
      await page
        .getByRole("button", { name: "Copy JSON", exact: true })
        .click();
      expect(
        JSON.parse(await page.evaluate(() => navigator.clipboard.readText())),
      ).toEqual(payload);
      await page
        .getByRole("button", { name: "Disable endpoint", exact: true })
        .click();
      await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .select("is_active")
            .eq("id", endpointId)
            .single()
        ).data?.is_active,
      ).toBe(false);
      await page
        .getByRole("button", { name: "Enable endpoint", exact: true })
        .click();
      await expect(page.getByText("Active", { exact: true })).toBeVisible();
    });

    await test.step("reject duplicate routes and edit the response", async () => {
      await page.goto(`${projectPath}/endpoints/new`);
      await page
        .getByRole("button", { name: "Create endpoint", exact: true })
        .click();
      await expect(page.locator("#path-error")).toContainText(
        "already has an endpoint",
      );
      await page.goto(`${endpointPath}/edit`);
      await page.getByLabel("Method", { exact: true }).selectOption("PATCH");
      await page
        .getByLabel("Path", { exact: true })
        .fill("/products/featured/");
      await page.getByLabel("Response status").fill("202");
      await page.getByLabel("JSON response body").fill('[{"updated":true}]');
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await page.waitForURL("**?notice=endpoint-updated");
      await page.reload();
      const updated = await owner.client
        .from("mock_endpoints")
        .select("*")
        .eq("id", endpointId)
        .single();
      expect(updated.data).toMatchObject({
        method: "PATCH",
        path: "/products/featured",
        status_code: 202,
        response_body: [{ updated: true }],
      });
      await expect(
        page.getByRole("heading", { name: "/products/featured", exact: true }),
      ).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({
        path: testInfo.outputPath("endpoint-desktop.png"),
        fullPage: true,
      });
    });

    await test.step("verify responsive forms and mobile navigation", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${endpointPath}/edit`);
      await expect(
        page.getByRole("button", { name: "Save changes", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("endpoint-mobile.png"),
        fullPage: true,
      });
      await page.locator("summary").click();
      await page.getByRole("link", { name: "Endpoints", exact: true }).click();
      await page.waitForURL("**/dashboard/endpoints");
      await expect(
        page.getByRole("link", { name: /PATCH.*\/products\/featured/ }),
      ).toBeVisible();
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    await test.step("deny cross-user reads, writes, reparenting, and dashboard URLs", async () => {
      const otherProject = await other.client
        .from("mock_projects")
        .insert({
          owner_id: other.id,
          name: "Other test user",
          slug: `${slug}-other`,
        })
        .select("id")
        .single();
      expect(otherProject.error).toBeNull();
      expect(
        (
          await other.client
            .from("mock_projects")
            .select("id")
            .eq("id", projectId)
        ).data,
      ).toEqual([]);
      expect(
        (
          await other.client
            .from("mock_endpoints")
            .select("id")
            .eq("id", endpointId)
        ).data,
      ).toEqual([]);
      expect(
        (
          await other.client
            .from("mock_projects")
            .update({ name: "Unauthorized" })
            .eq("id", projectId)
            .select("id")
        ).data,
      ).toEqual([]);
      expect(
        (
          await other.client
            .from("mock_endpoints")
            .insert({
              project_id: projectId,
              method: "POST",
              path: "/unauthorized",
            })
        ).error?.code,
      ).toBe("42501");
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .update({ project_id: otherProject.data!.id })
            .eq("id", endpointId)
        ).error?.code,
      ).toBe("42501");
      const otherContext = await browser.newContext({
        baseURL: "http://127.0.0.1:3100",
      });
      try {
        const otherPage = await otherContext.newPage();
        await login(otherPage, other);
        for (const path of [projectPath, `${projectPath}/edit`, endpointPath]) {
          await otherPage.goto(path);
          await expect(
            otherPage.getByRole("heading", {
              name: "This item is not available",
            }),
          ).toBeVisible();
          await expect(
            otherPage.getByRole("heading", { name: "Updated storefront" }),
          ).toHaveCount(0);
        }
      } finally {
        await otherContext.close();
      }
    });

    await test.step("delete an endpoint with confirmation", async () => {
      await page.goto(`${projectPath}/endpoints/new`);
      await page.getByLabel("Method", { exact: true }).selectOption("DELETE");
      await page.getByLabel("Path", { exact: true }).fill("/products/featured");
      await page
        .getByRole("button", { name: "Create endpoint", exact: true })
        .click();
      await page.waitForURL(/\?notice=endpoint-created$/);
      const disposableId = new URL(page.url()).pathname.split("/").at(-1)!;
      await page
        .getByRole("button", { name: "Delete endpoint", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox").fill("wrong");
      await dialog
        .getByRole("button", { name: "Delete endpoint", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toContainText(
        "current method and path",
      );
      await dialog.getByRole("textbox").fill("DELETE /products/featured");
      await dialog
        .getByRole("button", { name: "Delete endpoint", exact: true })
        .click();
      await page.waitForURL("**?notice=endpoint-deleted");
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .select("id")
            .eq("id", disposableId)
        ).data,
      ).toEqual([]);
    });

    await test.step("delete a project and cascade its remaining endpoints", async () => {
      await page
        .getByRole("button", { name: "Delete project", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await page
        .getByRole("button", { name: "Delete project", exact: true })
        .click();
      await dialog.getByRole("textbox").fill(renamedSlug);
      await dialog
        .getByRole("button", { name: "Delete project", exact: true })
        .click();
      await page.waitForURL("**/dashboard/projects?notice=project-deleted");
      expect(
        (
          await owner.client
            .from("mock_projects")
            .select("id")
            .eq("id", projectId)
        ).data,
      ).toEqual([]);
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .select("id")
            .eq("id", endpointId)
        ).data,
      ).toEqual([]);
    });
    expect(errors).toEqual([]);
  } finally {
    await cleanup();
  }
});

test("JSON null responses and database path constraints", async ({ page }) => {
  test.skip(
    process.env.MOCKFORGE_PHASE2_MIGRATION_APPLIED !== "true",
    "Apply 20261023120000_endpoint_configuration.sql and set MOCKFORGE_PHASE2_MIGRATION_APPLIED=true to run this check.",
  );
  const {
    users: [owner],
    cleanup,
  } = await createFixtureUsers(1);
  try {
    const project = await owner.client
      .from("mock_projects")
      .insert({
        owner_id: owner.id,
        name: "JSON null test",
        slug: `null-${randomUUID()}`,
      })
      .select("id")
      .single();
    expect(project.error).toBeNull();
    await login(page, owner);
    await page.goto(`/dashboard/projects/${project.data!.id}/endpoints/new`);
    await page.getByLabel("Path", { exact: true }).fill("/");
    await page.getByLabel("JSON response body").fill("null");
    await page
      .getByRole("button", { name: "Create endpoint", exact: true })
      .click();
    await page.waitForURL(/\?notice=endpoint-created$/);
    const endpointId = new URL(page.url()).pathname.split("/").at(-1)!;
    const saved = await owner.client
      .from("mock_endpoints")
      .select("response_body,path")
      .eq("id", endpointId)
      .single();
    expect(saved.error).toBeNull();
    expect(saved.data).toEqual({ response_body: null, path: "/" });
    expect(
      (
        await owner.client
          .from("mock_endpoints")
          .insert({
            project_id: project.data!.id,
            method: "GET",
            path: "/../bad",
          })
      ).error?.code,
    ).toBe("23514");
  } finally {
    await cleanup();
  }
});
