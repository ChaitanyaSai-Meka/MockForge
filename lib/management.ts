import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";

export async function managementContext() {
  const user = await requireUser();
  return { user, supabase: await createClient() };
}

export async function findOwnedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  ownerId: string,
) {
  return supabase.from("mock_projects").select("*").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
}

export async function getProject(projectId: string) {
  const { supabase, user } = await managementContext();
  if (!idSchema.safeParse(projectId).success) notFound();
  const { data, error } = await findOwnedProject(supabase, projectId, user.id);
  if (error) throw new Error("Unable to load this project. Please try again.");
  if (!data) notFound();
  return data;
}

export async function getEndpoint(projectId: string, endpointId: string) {
  const project = await getProject(projectId);
  if (!idSchema.safeParse(endpointId).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("mock_endpoints").select("*")
    .eq("id", endpointId).eq("project_id", project.id).maybeSingle();
  if (error) throw new Error("Unable to load this endpoint. Please try again.");
  if (!data) notFound();
  return { project, endpoint: data };
}

export const PAGE_SIZE = 12;
export function pageNumber(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100_000 ? page : 1;
}
