import { describe, expect, it, vi } from "vitest";

import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/utils";

describe("public configuration", () => {
  it("detects missing settings without throwing during page rendering", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabasePublicConfig).toThrow("Missing NEXT_PUBLIC_SUPABASE_URL");
  });

  it("returns only public settings", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-private-key");
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicConfig()).toEqual({ url: "https://project.example.com", publishableKey: "test-public-key" });
  });
});

describe("confirmation origin", () => {
  it("normalizes a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it.each(["javascript:alert(1)", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?next=other"])('rejects invalid origin %s', (origin) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    expect(getSiteUrl).toThrow();
  });

  it("does not send production confirmation links to localhost by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl).toThrow("canonical origin");
  });
});
