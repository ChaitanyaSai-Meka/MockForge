import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { getCurrentUser, requireUser } from "@/lib/auth";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
});

it("rejects an unauthenticated dashboard request", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
});

it("requires a user verified by Supabase", async () => {
  const user = { id: "verified-user", email: "dev@example.com" };
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  expect(await requireUser()).toEqual(user);
  expect(mocks.getUser).toHaveBeenCalledOnce();
});

it("does not trust a user returned alongside an auth error", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "unverified" } }, error: { message: "expired" } });
  await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
});

it("handles absent configuration without creating a client", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.createClient).not.toHaveBeenCalled();
});
