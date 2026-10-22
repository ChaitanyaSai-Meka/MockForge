import "server-only";

import { notFound } from "next/navigation";
import { managementContext, PAGE_SIZE, pageNumber } from "@/lib/management";
import { idSchema } from "@/lib/validation";

function historyQuery({
  supabase,
  user,
}: Awaited<ReturnType<typeof managementContext>>) {
  return supabase
    .from("request_logs")
    .select(
      "id, endpoint_id, method, requested_path, status_code, duration_ms, created_at, mock_endpoints!inner(project_id, method, path, mock_projects!inner(name, slug, owner_id))",
      { count: "exact" },
    )
    .eq("mock_endpoints.mock_projects.owner_id", user.id);
}

export async function getRequestHistory(
  endpointId?: string,
  pageValue?: string | string[],
) {
  const context = await managementContext();
  if (endpointId && !idSchema.safeParse(endpointId).success) notFound();
  const page = pageNumber(pageValue);
  let query = historyQuery(context);
  if (endpointId) query = query.eq("endpoint_id", endpointId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Unable to load request history.");
  return { records: data ?? [], count: count ?? 0, page };
}

export async function getHistoryEndpoint(endpointId: string) {
  const { supabase, user } = await managementContext();
  if (!idSchema.safeParse(endpointId).success) notFound();
  const { data, error } = await supabase
    .from("mock_endpoints")
    .select("id, project_id, method, path, mock_projects!inner(name, owner_id)")
    .eq("id", endpointId)
    .eq("mock_projects.owner_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load this endpoint.");
  if (!data) notFound();
  return data;
}

export async function getHistoryFilters() {
  const { supabase, user } = await managementContext();
  const { data, error } = await supabase
    .from("mock_endpoints")
    .select("id, project_id, method, path, mock_projects!inner(name, owner_id)")
    .eq("mock_projects.owner_id", user.id)
    .order("updated_at", { ascending: false })
    .order("id")
    .limit(50);
  if (error) throw new Error("Unable to load endpoint filters.");
  return data ?? [];
}

export async function getRequestLog(requestId: string) {
  const { supabase, user } = await managementContext();
  if (!idSchema.safeParse(requestId).success) notFound();
  const { data, error } = await supabase
    .from("request_logs")
    .select(
      "*, mock_endpoints!inner(project_id, method, path, mock_projects!inner(name, slug, owner_id))",
    )
    .eq("id", requestId)
    .eq("mock_endpoints.mock_projects.owner_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load this request.");
  if (!data) notFound();
  return data;
}

export type RequestSummary = Awaited<
  ReturnType<typeof getRequestHistory>
>["records"][number];
