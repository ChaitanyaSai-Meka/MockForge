import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  mocks.createClient.mockResolvedValue({ auth: mocks });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.verifyOtp.mockResolvedValue({ error: null });
});

describe("PKCE callback", () => {
  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/dashboard"])("ignores an untrusted next value: %s", async (next) => {
    const response = await callback(new Request(`https://example.com/auth/callback?code=test-code&next=${encodeURIComponent(next)}`));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toBe("https://example.com/dashboard");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("does not exchange a missing code", async () => {
    const response = await callback(new Request("https://example.com/auth/callback"));
    expect(response.headers.get("location")).toBe("https://example.com/login?error=confirmation_failed");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("handles rejected codes safely", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: "private detail" } });
    const response = await callback(new Request("https://example.com/auth/callback?code=invalid"));
    expect(response.headers.get("location")).toBe("https://example.com/login?error=confirmation_failed");
  });
});

describe("email confirmation", () => {
  it("verifies a token hash and enters the dashboard", async () => {
    const response = await confirm(new Request("https://example.com/auth/confirm?token_hash=test-hash&type=email"));
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "test-hash", type: "email" });
    expect(response.headers.get("location")).toBe("https://example.com/dashboard");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects unrelated token types", async () => {
    const response = await confirm(new Request("https://example.com/auth/confirm?token_hash=test-hash&type=recovery"));
    expect(response.headers.get("location")).toContain("confirmation_failed");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("handles upstream exceptions with a safe redirect", async () => {
    mocks.verifyOtp.mockRejectedValue(new Error("private detail"));
    const response = await confirm(new Request("https://example.com/auth/confirm?token_hash=test-hash&type=email"));
    expect(response.headers.get("location")).toBe("https://example.com/login?error=confirmation_failed");
  });
});
