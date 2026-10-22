import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Token-hash verification supports opening the confirmation email on another
// device, where the original browser's PKCE verifier cookie is unavailable.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let destination = "/login?error=confirmation_failed";

  if (tokenHash && tokenHash.length <= 2048 && type === "email" && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      if (!error) destination = "/dashboard";
    } catch {
      // Redirect without reflecting the token or upstream error to the visitor.
    }
  }

  return NextResponse.redirect(new URL(destination, url.origin), {
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
