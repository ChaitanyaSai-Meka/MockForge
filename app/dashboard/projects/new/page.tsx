import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/utils";
import { ProjectForm } from "@/components/project-form";
import { WorkspaceHeader } from "@/components/workspace-ui";
import { createProjectAction } from "@/app/dashboard/projects/actions";

export const metadata = { title: "New project" };
export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeader
        title="Create a project"
        description="Start with a name and a unique URL slug."
        backHref="/dashboard/projects"
      />
      <ProjectForm origin={getSiteUrl()} action={createProjectAction} />
    </div>
  );
}
