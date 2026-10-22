import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createFixtureUsers, login } from "./helpers";

test("request logging, private inspector, filtering, pagination, and cascade cleanup", async ({
  page,
  request,
  browser,
  context,
}, testInfo) => {
  const {
    users: [owner, other],
    cleanup,
  } = await createFixtureUsers(2);
  const slug = `history-${randomUUID().slice(0, 12)}`;
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  try {
    const project = await owner.client
      .from("mock_projects")
      .insert({ owner_id: owner.id, name: "History fixture", slug })
      .select("id")
      .single();
    expect(project.error).toBeNull();
    const projectId = project.data!.id;
    const endpoints = await owner.client
      .from("mock_endpoints")
      .insert([
        {
          project_id: projectId,
          method: "GET",
          path: "/products",
          status_code: 200,
          is_active: true,
          response_body: { ok: true },
        },
        {
          project_id: projectId,
          method: "POST",
          path: "/empty",
          status_code: 204,
          is_active: true,
          response_body: {},
        },
        {
          project_id: projectId,
          method: "GET",
          path: "/disabled",
          status_code: 200,
          is_active: false,
          response_body: {},
        },
      ])
      .select("id,path");
    expect(endpoints.error).toBeNull();
    const endpointId = endpoints.data!.find(
      (row) => row.path === "/products",
    )!.id;
    const endpointPath = `/dashboard/projects/${projectId}/endpoints/${endpointId}`;
    const base = `/mock/${slug}`;

    await login(page, owner);
    await page.goto(endpointPath);
    await expect(
      page.getByRole("heading", { name: "No requests recorded yet" }),
    ).toBeVisible();

    await test.step("write bounded metadata without request secrets", async () => {
      for (let index = 0; index < 13; index++) {
        const response = await request.get(
          `${base}/products?page=${index}&limit=20&offset=0&order=asc&token=NEVER_STORE_ME&anything=NEVER_STORE_ME`,
          {
            headers: {
              Authorization: "Bearer NEVER_STORE_ME",
              Cookie: "session=NEVER_STORE_ME",
            },
          },
        );
        expect(response.status()).toBe(200);
      }
      expect(
        (
          await request.post(`${base}/empty`, {
            data: { password: "NEVER_STORE_ME" },
          })
        ).status(),
      ).toBe(204);
      expect((await request.get(`${base}/disabled`)).status()).toBe(404);
      await request.get(`${base}/missing`);
      await request.post(`${base}/products`);
      await request.fetch(`${base}/products`, { method: "OPTIONS" });
      await request.head(`${base}/products`);
      await expect
        .poll(async () => {
          const logs = await owner.client
            .from("request_logs")
            .select("id", { count: "exact", head: true });
          expect(logs.error).toBeNull();
          return logs.count;
        })
        .toBe(15);
      const logs = await owner.client.from("request_logs").select("*");
      expect(logs.error).toBeNull();
      expect(JSON.stringify(logs.data)).not.toContain("NEVER_STORE_ME");
      const productLogs = logs.data!.filter(
        (row) => row.endpoint_id === endpointId,
      );
      expect(productLogs).toHaveLength(13);
      for (const row of productLogs) {
        expect(row.requested_path).toBe(`${base}/products`);
        expect(row.status_code).toBe(200);
        expect(row.query_params).toMatchObject({
          limit: "20",
          offset: "0",
          order: "asc",
        });
        expect(row.duration_ms).toBeGreaterThanOrEqual(0);
      }
      expect(logs.data!.map((row) => row.status_code)).toEqual(
        expect.arrayContaining([204, 404]),
      );
    });

    await test.step("refresh endpoint history, filter activity, and paginate", async () => {
      await page.getByRole("button", { name: "Refresh requests" }).click();
      await expect(
        page.getByText("13 recorded requests · newest first"),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Request history" }).locator("li"),
      ).toHaveCount(12);
      await page.getByRole("link", { name: "Next", exact: true }).click();
      await expect(
        page.getByRole("list", { name: "Request history" }).locator("li"),
      ).toHaveCount(1);
      await page.goto("/dashboard/activity");
      await expect(
        page.getByText("15 recorded requests", { exact: true }),
      ).toBeVisible();
      await page.getByLabel("Filter by endpoint").selectOption(endpointId);
      await page.getByRole("button", { name: "Apply filter" }).click();
      await expect(
        page.getByText("13 recorded requests", { exact: true }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Next", exact: true }).click();
      expect(new URL(page.url()).searchParams.get("endpoint")).toBe(endpointId);
      await expect(
        page.getByRole("list", { name: "Request history" }).locator("li"),
      ).toHaveCount(1);
      await page.getByRole("link", { name: "Previous", exact: true }).click();
      await expect(
        page.getByRole("list", { name: "Request history" }).locator("li"),
      ).toHaveCount(12);
      await page.screenshot({
        path: testInfo.outputPath("activity-desktop.png"),
        fullPage: true,
      });
      await request.get(`${base}/products?page=14`);
      await expect
        .poll(
          async () =>
            (
              await owner.client
                .from("request_logs")
                .select("id", { count: "exact", head: true })
                .eq("endpoint_id", endpointId)
            ).count,
        )
        .toBe(14);
      await page.getByRole("button", { name: "Refresh requests" }).click();
      await expect(
        page.getByText("14 recorded requests", { exact: true }),
      ).toBeVisible();
      await page.goto("/dashboard");
      await expect(
        page.locator("article").filter({ hasText: "Recorded requests" }),
      ).toContainText("16");
      await expect(
        page.getByRole("heading", { name: "Recent requests" }),
      ).toBeVisible();
    });

    const log = await owner.client
      .from("request_logs")
      .select("*")
      .eq("endpoint_id", endpointId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    expect(log.error).toBeNull();
    const logId = log.data!.id;
    await test.step("inspect individual records on desktop and mobile", async () => {
      await page.goto(`/dashboard/activity/${logId}`);
      await expect(
        page.getByRole("heading", { name: "Request details", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(`${base}/products`, { exact: true }),
      ).toBeVisible();
      await expect(page.locator("pre")).toContainText('"page": "0"');
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy query JSON" }).click();
      expect(
        JSON.parse(await page.evaluate(() => navigator.clipboard.readText())),
      ).toEqual({ page: "0", limit: "20", offset: "0", order: "asc" });
      await page.setViewportSize({ width: 320, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("request-mobile.png"),
        fullPage: true,
      });
      await page.getByRole("link", { name: /Endpoint history/ }).click();
      await expect(page.getByLabel("Filter by endpoint")).toHaveValue(
        endpointId,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.locator("summary").click();
      await page.getByRole("link", { name: "Activity", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Request activity" }),
      ).toBeVisible();
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    await test.step("deny cross-user history access and all browser log writes", async () => {
      expect(
        (await other.client.from("request_logs").select("*").eq("id", logId))
          .data,
      ).toEqual([]);
      for (const client of [owner.client, other.client]) {
        expect(
          (
            await client.from("request_logs").insert({
              endpoint_id: endpointId,
              method: "GET",
              requested_path: "/forged",
              status_code: 200,
              duration_ms: 0,
            })
          ).error?.code,
        ).toBe("42501");
        expect(
          (
            await client
              .from("request_logs")
              .update({ status_code: 500 })
              .eq("id", logId)
          ).error?.code,
        ).toBe("42501");
        expect(
          (await client.from("request_logs").delete().eq("id", logId)).error
            ?.code,
        ).toBe("42501");
      }
      const otherContext = await browser.newContext({
        baseURL: "http://127.0.0.1:3100",
      });
      try {
        const otherPage = await otherContext.newPage();
        await login(otherPage, other);
        await otherPage.goto("/dashboard/activity");
        await expect(
          otherPage.getByRole("heading", { name: "No requests recorded yet" }),
        ).toBeVisible();
        for (const path of [
          `/dashboard/activity/${logId}`,
          `/dashboard/activity?endpoint=${endpointId}`,
          "/dashboard/activity/not-a-uuid",
          "/dashboard/activity?endpoint=invalid",
        ]) {
          await otherPage.goto(path);
          await expect(
            otherPage.getByRole("heading", {
              name: "This item is not available",
            }),
          ).toBeVisible();
          await expect(
            otherPage.getByText(`${base}/products`, { exact: true }),
          ).toHaveCount(0);
        }
      } finally {
        await otherContext.close();
      }
    });

    await test.step("preserve historical paths after edits and cascade logs on deletion", async () => {
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .update({ path: "/renamed" })
            .eq("id", endpointId)
        ).error,
      ).toBeNull();
      await page.goto(`/dashboard/activity/${logId}`);
      await expect(
        page.getByText(`${base}/products`, { exact: true }),
      ).toBeVisible();
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .delete()
            .eq("id", endpointId)
        ).error,
      ).toBeNull();
      expect(
        (
          await owner.client
            .from("request_logs")
            .select("id")
            .eq("endpoint_id", endpointId)
        ).data,
      ).toEqual([]);
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "This item is not available" }),
      ).toBeVisible();
      expect(
        (await owner.client.from("mock_projects").delete().eq("id", projectId))
          .error,
      ).toBeNull();
      expect(
        (await owner.client.from("request_logs").select("id")).data,
      ).toEqual([]);
    });
    expect(browserErrors).toEqual([]);
  } finally {
    await cleanup();
  }
});
