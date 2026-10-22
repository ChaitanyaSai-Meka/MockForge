import { getProject } from "@/lib/management";
import { getSiteUrl } from "@/lib/utils";
import { ProjectForm } from "@/components/project-form";
import { WorkspaceHeader } from "@/components/workspace-ui";
import { updateProjectAction } from "@/app/dashboard/projects/actions";

export const metadata = { title: "Edit project" };
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeader
        title="Edit project"
        description="Update the project name, URL slug, or description."
        backHref={`/dashboard/projects/${project.id}`}
        backLabel={project.name}
      />
      <ProjectForm
        project={project}
        origin={getSiteUrl()}
        action={updateProjectAction.bind(null, project.id)}
      />
    </div>
  );
}
