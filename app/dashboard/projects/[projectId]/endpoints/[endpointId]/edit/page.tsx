import { getEndpoint } from "@/lib/management";
import { getSiteUrl } from "@/lib/utils";
import { EndpointForm } from "@/components/endpoint-form";
import { WorkspaceHeader } from "@/components/workspace-ui";
import { updateEndpointAction } from "@/app/dashboard/projects/[projectId]/endpoints/actions";

export const metadata = { title: "Edit endpoint" };
export default async function EditEndpointPage({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string }>;
}) {
  const { projectId, endpointId } = await params;
  const { project, endpoint } = await getEndpoint(projectId, endpointId);
  return (
    <div className="mx-auto max-w-4xl">
      <WorkspaceHeader
        title="Edit endpoint"
        description={`${endpoint.method} ${endpoint.path} · ${project.name}`}
        backHref={`/dashboard/projects/${project.id}/endpoints/${endpoint.id}`}
        backLabel="Endpoint details"
      />
      <EndpointForm
        endpoint={endpoint}
        projectId={project.id}
        slug={project.slug}
        origin={getSiteUrl()}
        action={updateEndpointAction.bind(null, project.id, endpoint.id)}
      />
    </div>
  );
}
