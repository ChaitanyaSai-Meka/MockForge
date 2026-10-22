"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, mutationError } from "@/lib/action-state";
import { findOwnedProject, managementContext } from "@/lib/management";
import { endpointSchema, idSchema } from "@/lib/validation";

async function ownedContext(projectId: string) {
  const { supabase, user } = await managementContext();
  if (!idSchema.safeParse(projectId).success)
    return { error: "Project not found." } as const;
  const { data: project, error } = await findOwnedProject(
    supabase,
    projectId,
    user.id,
  );
  if (error)
    return { error: "Could not load this project. Please try again." } as const;
  if (!project) return { error: "Project not found." } as const;
  return { supabase, project };
}

function endpointInput(form: FormData) {
  return endpointSchema.safeParse({
    method: form.get("method"),
    path: form.get("path"),
    status_code: form.get("status_code"),
    response_body: form.get("response_body"),
    is_active: form.get("is_active") === "on",
  });
}

export async function createEndpointAction(
  projectId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await ownedContext(projectId);
  if (context.error) return { status: "error", message: context.error };
  const parsed = endpointInput(form);
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const { data, error } = await context.supabase
    .from("mock_endpoints")
    .insert({ ...parsed.data, project_id: context.project.id })
    .select("id")
    .single();
  if (error || !data) return mutationError(error?.code, "endpoint");
  revalidatePath("/dashboard", "layout");
  redirect(
    `/dashboard/projects/${projectId}/endpoints/${data.id}?notice=endpoint-created`,
  );
}

export async function updateEndpointAction(
  projectId: string,
  endpointId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await ownedContext(projectId);
  if (context.error) return { status: "error", message: context.error };
  if (!idSchema.safeParse(endpointId).success)
    return { status: "error", message: "Endpoint not found." };
  const parsed = endpointInput(form);
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const { data, error } = await context.supabase
    .from("mock_endpoints")
    .update(parsed.data)
    .eq("id", endpointId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();
  if (error) return mutationError(error.code, "endpoint");
  if (!data) return { status: "error", message: "Endpoint not found." };
  revalidatePath("/dashboard", "layout");
  redirect(
    `/dashboard/projects/${projectId}/endpoints/${endpointId}?notice=endpoint-updated`,
  );
}

export async function toggleEndpointAction(
  projectId: string,
  endpointId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await ownedContext(projectId);
  if (context.error) return { status: "error", message: context.error };
  const active = form.get("is_active");
  if (
    !idSchema.safeParse(endpointId).success ||
    (active !== "true" && active !== "false")
  ) {
    return { status: "error", message: "Invalid endpoint configuration." };
  }
  const { data, error } = await context.supabase
    .from("mock_endpoints")
    .update({ is_active: active === "true" })
    .eq("id", endpointId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();
  if (error) return mutationError(error.code, "endpoint");
  if (!data) return { status: "error", message: "Endpoint not found." };
  revalidatePath("/dashboard", "layout");
  return {
    status: "success",
    message: active === "true" ? "Endpoint enabled." : "Endpoint disabled.",
  };
}

export async function deleteEndpointAction(
  projectId: string,
  endpointId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await ownedContext(projectId);
  if (context.error) return { status: "error", message: context.error };
  if (!idSchema.safeParse(endpointId).success)
    return { status: "error", message: "Endpoint not found." };
  const { data: endpoint, error: lookupError } = await context.supabase
    .from("mock_endpoints")
    .select("method,path")
    .eq("id", endpointId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (lookupError) return mutationError();
  if (!endpoint) return { status: "error", message: "Endpoint not found." };
  if (form.get("confirmation") !== `${endpoint.method} ${endpoint.path}`) {
    return {
      status: "error",
      message: "Enter the current method and path to confirm deletion.",
    };
  }
  const { data, error } = await context.supabase
    .from("mock_endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("project_id", projectId)
    .eq("method", endpoint.method)
    .eq("path", endpoint.path)
    .select("id")
    .maybeSingle();
  if (error)
    return {
      status: "error",
      message: "Could not delete this endpoint. Please try again.",
    };
  if (!data)
    return {
      status: "error",
      message: "The endpoint changed. Reload the page and try again.",
    };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/projects/${projectId}?notice=endpoint-deleted`);
}
