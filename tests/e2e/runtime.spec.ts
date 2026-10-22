import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { Database } from "../../lib/database.types";
import { createFixtureUsers } from "./helpers";

test("public runtime returns live database responses with exact routing and browser CORS", async ({
  request,
  page,
}) => {
  const {
    users: [owner],
    cleanup,
  } = await createFixtureUsers(1);
  const slug = `runtime-${randomUUID().slice(0, 12)}`;
  const base = `/mock/${slug}`;
  try {
    const project = await owner.client
      .from("mock_projects")
      .insert({
        owner_id: owner.id,
        name: "Private runtime fixture",
        slug,
        description: "Never expose project configuration.",
      })
      .select("id")
      .single();
    expect(project.error).toBeNull();
    const projectId = project.data!.id;
    const rows: Database["public"]["Tables"]["mock_endpoints"]["Insert"][] = [
      ...["GET", "POST", "PUT", "PATCH", "DELETE"].map((method, index) => ({
        project_id: projectId,
        method,
        path: "/products",
        status_code: [200, 201, 202, 409, 204][index],
        response_body: { method, source: "stored configuration" },
      })),
      { project_id: projectId, method: "GET", path: "/", response_body: null },
      {
        project_id: projectId,
        method: "GET",
        path: "/array",
        response_body: [1, "two"],
      },
      {
        project_id: projectId,
        method: "GET",
        path: "/scalar",
        response_body: false,
      },
      {
        project_id: projectId,
        method: "GET",
        path: "/limited",
        response_body: { ok: true },
      },
      {
        project_id: projectId,
        method: "PUT",
        path: "/limited",
        is_active: false,
      },
      {
        project_id: projectId,
        method: "GET",
        path: "/disabled",
        is_active: false,
      },
      ...[204, 205, 304, 599].map((status_code) => ({
        project_id: projectId,
        method: "GET",
        path: `/status-${status_code}`,
        status_code,
        response_body: { saved: true },
      })),
    ];
    const inserted = await owner.client
      .from("mock_endpoints")
      .insert(rows, { defaultToNull: false })
      .select("id,method,path");
    expect(inserted.error).toBeNull();
    const getId = inserted.data!.find(
      (row) => row.method === "GET" && row.path === "/products",
    )!.id;

    await test.step("serve every configured method, status, and JSON value anonymously", async () => {
      for (const row of rows.filter((row) => row.path === "/products")) {
        const response = await request.fetch(
          `${base}/products?category=books`,
          {
            method: row.method,
            headers: {
              Authorization: "Bearer not-an-auth-session",
              Cookie: "untrusted=session",
            },
            data: row.method === "GET" ? undefined : "ignored request body",
          },
        );
        expect(response.status()).toBe(row.status_code);
        expect(response.headers()["access-control-allow-origin"]).toBe("*");
        expect(response.headers()["cache-control"]).toContain("no-store");
        expect(response.headers()["set-cookie"]).toBeUndefined();
        if (row.status_code === 204) expect(await response.text()).toBe("");
        else {
          expect(response.headers()["content-type"]).toContain(
            "application/json",
          );
          expect(await response.json()).toEqual(row.response_body);
        }
      }
      expect(await (await request.get(base)).json()).toBeNull();
      expect(await (await request.get(`${base}/array`)).json()).toEqual([
        1,
        "two",
      ]);
      expect(await (await request.get(`${base}/scalar`)).json()).toBe(false);
      for (const status of [204, 205, 304]) {
        const response = await request.get(`${base}/status-${status}`);
        expect(response.status()).toBe(status);
        expect(await response.text()).toBe("");
      }
      expect((await request.get(`${base}/status-599`)).status()).toBe(599);
    });

    await test.step("normalize trailing slashes without redirecting calls or preflight", async () => {
      expect(
        (await request.get(`${base}/products/`, { maxRedirects: 0 })).status(),
      ).toBe(200);
      const options = await request.fetch(`${base}/products/`, {
        method: "OPTIONS",
        maxRedirects: 0,
        headers: {
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "Content-Type, Authorization, X-App-Key",
          Origin: "https://frontend.example",
        },
      });
      expect(options.status()).toBe(204);
      expect(options.headers()["access-control-allow-methods"]).toBe(
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      expect(options.headers()["access-control-allow-headers"]).toBe(
        "content-type, authorization, x-app-key",
      );
      expect(
        options.headers()["access-control-allow-credentials"],
      ).toBeUndefined();
    });

    await test.step("return consistent missing/disabled/method errors and strict matching", async () => {
      for (const path of [
        `/mock/missing-${slug}/products`,
        `${base}/missing`,
        `${base}/Products`,
        `${base}/products/123`,
        `${base}/disabled`,
      ]) {
        const response = await request.get(path);
        expect(response.status()).toBe(404);
        expect(await response.json()).toMatchObject({
          error: { code: "ENDPOINT_NOT_FOUND" },
        });
        expect(response.headers()["access-control-allow-origin"]).toBe("*");
      }
      const wrongMethod = await request.post(`${base}/limited`);
      expect(wrongMethod.status()).toBe(405);
      expect(wrongMethod.headers()["allow"]).toBe("GET, OPTIONS");
      expect(await wrongMethod.json()).toMatchObject({
        error: { code: "METHOD_NOT_ALLOWED" },
      });
      expect((await request.put(`${base}/limited`)).status()).toBe(404);
      const head = await request.head(`${base}/products`);
      expect(head.status()).toBe(405);
      expect(await head.text()).toBe("");
      expect(
        (
          await request.fetch(`${base}/disabled`, { method: "OPTIONS" })
        ).status(),
      ).toBe(404);
      const unsupported = await request.fetch(`${base}/limited`, {
        method: "OPTIONS",
        headers: { "Access-Control-Request-Method": "POST" },
      });
      expect(unsupported.status()).toBe(405);
      expect(unsupported.headers()["allow"]).toBe("GET, OPTIONS");
      expect((await request.get("/mock")).status()).toBe(400);
      const encoded = await request.get(`${base}/products%2F123`);
      expect(encoded.status()).toBe(400);
      expect(await encoded.json()).toMatchObject({
        error: { code: "INVALID_REQUEST" },
      });
      expect(
        (await request.get(`${base}/products?q=${"x".repeat(8192)}`)).status(),
      ).toBe(414);
    });

    await test.step("keep projects with the same endpoint path separate", async () => {
      const second = await owner.client
        .from("mock_projects")
        .insert({
          owner_id: owner.id,
          name: "Separate runtime fixture",
          slug: `${slug}-other`,
        })
        .select("id")
        .single();
      expect(second.error).toBeNull();
      expect(
        (
          await owner.client.from("mock_endpoints").insert({
            project_id: second.data!.id,
            method: "GET",
            path: "/products",
            response_body: { different: true },
          })
        ).error,
      ).toBeNull();
      expect(
        await (await request.get(`/mock/${slug}-other/products`)).json(),
      ).toEqual({ different: true });
      expect(await (await request.get(`${base}/products`)).json()).toEqual({
        method: "GET",
        source: "stored configuration",
      });
    });

    await test.step("allow an actual browser on another origin to preflight and read responses", async () => {
      // Different hostnames are different origins. Use a real loopback page:
      // intercepted documents have no peer address and Chromium's local-network
      // protection can block their requests before CORS is even evaluated.
      await page.goto("http://localhost:3100/");
      const result = await page.evaluate(async (path) => {
        const response = await fetch(`http://127.0.0.1:3100${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer example",
            "x-app-key": "example",
          },
          body: JSON.stringify({ ignored: true }),
          credentials: "omit",
        });
        return { status: response.status, body: await response.json() };
      }, `${base}/products`);
      expect(result).toEqual({
        status: 201,
        body: { method: "POST", source: "stored configuration" },
      });
      const error = await page.evaluate(async (path) => {
        const response = await fetch(`http://127.0.0.1:3100${path}`, {
          method: "POST",
        });
        return {
          status: response.status,
          allow: response.headers.get("allow"),
          body: await response.json(),
        };
      }, `${base}/limited`);
      expect(error).toMatchObject({
        status: 405,
        allow: "GET, OPTIONS",
        body: { error: { code: "METHOD_NOT_ALLOWED" } },
      });
    });

    await test.step("reflect edits, disabling, slug changes, and deletion immediately", async () => {
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .update({ response_body: { version: 2 }, status_code: 202 })
            .eq("id", getId)
        ).error,
      ).toBeNull();
      const updated = await request.get(`${base}/products`);
      expect(updated.status()).toBe(202);
      expect(await updated.json()).toEqual({ version: 2 });
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .update({ is_active: false })
            .eq("id", getId)
        ).error,
      ).toBeNull();
      expect((await request.get(`${base}/products`)).status()).toBe(404);
      expect(
        (
          await owner.client
            .from("mock_endpoints")
            .update({ is_active: true, method: "PATCH", path: "/changed" })
            .eq("id", getId)
        ).error,
      ).toBeNull();
      expect((await request.get(`${base}/products`)).status()).toBe(405);
      expect((await request.get(`${base}/changed`)).status()).toBe(405);
      expect(await (await request.patch(`${base}/changed`)).json()).toEqual({
        version: 2,
      });
      const newSlug = `${slug}-renamed`;
      expect(
        (
          await owner.client
            .from("mock_projects")
            .update({ slug: newSlug })
            .eq("id", projectId)
        ).error,
      ).toBeNull();
      expect((await request.patch(`${base}/changed`)).status()).toBe(404);
      expect((await request.patch(`/mock/${newSlug}/changed`)).status()).toBe(
        202,
      );
      expect(
        (await owner.client.from("mock_endpoints").delete().eq("id", getId))
          .error,
      ).toBeNull();
      expect((await request.patch(`/mock/${newSlug}/changed`)).status()).toBe(
        404,
      );
      expect(
        (await owner.client.from("mock_projects").delete().eq("id", projectId))
          .error,
      ).toBeNull();
      expect((await request.get(`/mock/${newSlug}`)).status()).toBe(404);
    });
  } finally {
    await cleanup();
  }
});
