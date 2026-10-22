import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { loginAction, signupAction } from "@/app/(auth)/actions";
import { signOutAction } from "@/app/dashboard/actions";

const idle = { status: "idle" as const };

function credentials(email = "dev@example.com", password = "password123") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  mocks.createClient.mockResolvedValue({ auth: mocks });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

describe("server-side auth validation", () => {
  it("rejects invalid login fields without calling Supabase", async () => {
    const state = await loginAction(idle, credentials("bad-email", ""));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.fieldErrors?.password).toBeDefined();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects short sign-up passwords", async () => {
    const state = await signupAction(idle, credentials("dev@example.com", "short"));
    expect(state.fieldErrors?.password).toBeDefined();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it.each([loginAction, signupAction])("handles missing configuration safely", async (action) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(await action(idle, credentials())).toMatchObject({ status: "error", message: expect.stringContaining("unavailable") });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("login and sign-up", () => {
  it("trims email and redirects after successful login", async () => {
    await expect(loginAction(idle, credentials(" dev@example.com "))).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "dev@example.com", password: "password123" });
  });

  it("never exposes provider errors or passwords", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "private provider detail", status: 400 } });
    const state = await loginAction(idle, credentials());
    expect(state.status).toBe("error");
    expect(JSON.stringify(state)).not.toMatch(/private provider detail|password123/);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("reports rate limiting", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 429 } });
    expect(await loginAction(idle, credentials())).toMatchObject({ message: expect.stringContaining("Too many attempts") });
  });

  it("handles a network failure without leaking details", async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error("internal network details"));
    expect(await loginAction(idle, credentials())).toMatchObject({ status: "error", message: expect.stringContaining("unavailable") });
  });

  it("requests confirmation at the configured origin", async () => {
    expect(await signupAction(idle, credentials())).toMatchObject({ status: "success" });
    expect(mocks.signUp).toHaveBeenCalledWith({ email: "dev@example.com", password: "password123", options: { emailRedirectTo: "https://example.com/auth/callback" } });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects immediately when confirmation is disabled", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "test-token" } }, error: null });
    await expect(signupAction(idle, credentials())).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("sign-out", () => {
  it("ends only the current session and redirects", async () => {
    await expect(signOutAction()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps the user on the page with feedback when sign-out fails", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "private detail" } });
    expect(await signOutAction()).toEqual({ error: "Could not sign out. Please try again." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
