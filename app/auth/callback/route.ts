import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function authRedirect(path: string, origin: string) {
  return NextResponse.redirect(new URL(path, origin), {
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (code && code.length <= 2048 && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Keep the destination fixed; never redirect to an untrusted `next` URL.
        return authRedirect("/dashboard", requestUrl.origin);
      }
    } catch {
      // Show a safe, actionable notice without exposing provider errors.
    }
  }

  return authRedirect("/login?error=confirmation_failed", requestUrl.origin);
}
