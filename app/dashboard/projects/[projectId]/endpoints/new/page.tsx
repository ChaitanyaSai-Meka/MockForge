import { getProject } from "@/lib/management";
import { getSiteUrl } from "@/lib/utils";
import { EndpointForm } from "@/components/endpoint-form";
import { WorkspaceHeader } from "@/components/workspace-ui";
import { createEndpointAction } from "@/app/dashboard/projects/[projectId]/endpoints/actions";

export const metadata = { title: "New endpoint" };
export default async function NewEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return (
    <div className="mx-auto max-w-4xl">
      <WorkspaceHeader
        title="Create an endpoint"
        description={`Configure a response for ${project.name}.`}
        backHref={`/dashboard/projects/${project.id}`}
        backLabel={project.name}
      />
      <EndpointForm
        projectId={project.id}
        slug={project.slug}
        origin={getSiteUrl()}
        action={createEndpointAction.bind(null, project.id)}
      />
    </div>
  );
}
