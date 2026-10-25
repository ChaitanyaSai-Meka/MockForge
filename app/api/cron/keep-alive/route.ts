import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const DAY_MS = 24 * 60 * 60 * 1_000;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Keep-alive is not configured." },
      { status: 503, headers },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  }

  if (Math.floor(Date.now() / DAY_MS) % 2 !== 0) {
    return Response.json({ ok: true, skipped: true }, { headers });
  }

  try {
    const { error } = await createAdminClient()
      .from("mock_projects")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(5_000));
    if (error) throw new Error("Database query failed.");

    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("MockForge database keep-alive failed.");
    return Response.json(
      { error: "Database unavailable." },
      { status: 503, headers },
    );
  }
}
