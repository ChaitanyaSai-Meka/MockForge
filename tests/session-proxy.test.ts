import type { CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => void;
};

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

import { updateSession } from "@/lib/supabase/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
});

it("preserves refresh cookies and cache headers through multiple writes", async () => {
  mocks.createServerClient.mockImplementation((_url, _key, { cookies }: { cookies: CookieAdapter }) => ({
    auth: { getUser: async () => {
      cookies.setAll([{ name: "session.0", value: "first", options: { path: "/", httpOnly: true } }], { "Cache-Control": "private, no-store", "Pragma": "no-cache", "Expires": "0" });
      cookies.setAll([{ name: "session.1", value: "second", options: { path: "/", httpOnly: true } }], {});
      return { data: { user: null }, error: null };
    } },
  }));

  const request = new NextRequest("https://example.com/dashboard");
  const response = await updateSession(request);
  expect(request.cookies.get("session.0")?.value).toBe("first");
  expect(request.cookies.get("session.1")?.value).toBe("second");
  expect(response.cookies.get("session.0")?.value).toBe("first");
  expect(response.cookies.get("session.1")?.value).toBe("second");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("session.0=first");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("session.1=second");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
});

it("allows unconfigured auth pages to render their setup notice", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  const response = await updateSession(new NextRequest("https://example.com/login"));
  expect(response.status).toBe(200);
  expect(mocks.createServerClient).not.toHaveBeenCalled();
});
