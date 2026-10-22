"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, mutationError } from "@/lib/action-state";
import { findOwnedProject, managementContext } from "@/lib/management";
import { idSchema, projectSchema } from "@/lib/validation";

function projectInput(form: FormData) {
  return projectSchema.safeParse({
    name: form.get("name"),
    slug: form.get("slug"),
    description: form.get("description") ?? "",
  });
}

export async function createProjectAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, supabase } = await managementContext();
  const parsed = projectInput(form);
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const { data, error } = await supabase
    .from("mock_projects")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id")
    .single();
  if (error || !data) return mutationError(error?.code);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/projects/${data.id}?notice=project-created`);
}

export async function updateProjectAction(
  projectId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, supabase } = await managementContext();
  if (!idSchema.safeParse(projectId).success)
    return { status: "error", message: "Project not found." };
  const parsed = projectInput(form);
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const { data, error } = await supabase
    .from("mock_projects")
    .update(parsed.data)
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return mutationError(error.code);
  if (!data) return { status: "error", message: "Project not found." };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/projects/${projectId}?notice=project-updated`);
}

export async function deleteProjectAction(
  projectId: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, supabase } = await managementContext();
  if (!idSchema.safeParse(projectId).success)
    return { status: "error", message: "Project not found." };
  const { data: project, error: lookupError } = await findOwnedProject(
    supabase,
    projectId,
    user.id,
  );
  if (lookupError) return mutationError();
  if (!project) return { status: "error", message: "Project not found." };
  if (form.get("confirmation") !== project.slug)
    return {
      status: "error",
      message: "Enter the current project slug to confirm deletion.",
    };
  const { data, error } = await supabase
    .from("mock_projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .eq("slug", project.slug)
    .select("id")
    .maybeSingle();
  if (error)
    return {
      status: "error",
      message: "Could not delete this project. Please try again.",
    };
  if (!data)
    return {
      status: "error",
      message: "The project changed. Reload the page and try again.",
    };
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/projects?notice=project-deleted");
}
