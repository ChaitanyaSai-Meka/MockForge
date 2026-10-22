import Link from "next/link";
import { getEndpoint } from "@/lib/management";
import { getSiteUrl } from "@/lib/utils";
import { buildMockUrl, hasResponseBody } from "@/lib/validation";
import { CopyButton } from "@/components/copy-button";
import { DeleteDialog } from "@/components/delete-dialog";
import { EndpointToggle } from "@/components/endpoint-toggle";
import {
  formatDate,
  MethodBadge,
  secondaryButton,
  StatusBadge,
  SuccessNotice,
  WorkspaceHeader,
} from "@/components/workspace-ui";
import {
  deleteEndpointAction,
  toggleEndpointAction,
} from "@/app/dashboard/projects/[projectId]/endpoints/actions";

export const metadata = { title: "Endpoint" };
export default async function EndpointPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; endpointId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { projectId, endpointId } = await params;
  const { project, endpoint } = await getEndpoint(projectId, endpointId);
  const { notice } = await searchParams;
  const base = `/dashboard/projects/${project.id}/endpoints/${endpoint.id}`;
  const url = buildMockUrl(getSiteUrl(), project.slug, endpoint.path);
  const json = JSON.stringify(endpoint.response_body, null, 2);
  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeader
        title={endpoint.path}
        description={`Endpoint in ${project.name}`}
        backHref={`/dashboard/projects/${project.id}`}
        backLabel={project.name}
      >
        <Link className={secondaryButton} href={`${base}/edit`}>
          Edit endpoint
        </Link>
      </WorkspaceHeader>
      <SuccessNotice notice={notice} />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <MethodBadge method={endpoint.method} />
        <StatusBadge active={endpoint.is_active} />
        <span className="font-mono text-sm text-slate-300">
          HTTP {endpoint.status_code}
        </span>
      </div>
      <section className="rounded-xl border border-white/10 bg-[#0c1117] p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="text-xs font-medium text-slate-400">
              Generated mock URL
            </h2>
            <p className="mt-2 break-all font-mono text-sm text-emerald-200">
              {url}
            </p>
          </div>
          <CopyButton value={url} />
        </div>
        <p className="mt-4 text-xs leading-5 text-amber-200/80">
          This configuration is saved. Mock serving is coming soon. Anyone with
          the URL will be able to access the configured response.
        </p>
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0c1117]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-sm font-semibold">Response preview</h2>
            <p className="mt-1 text-xs text-slate-400">
              Saved JSON · application/json
            </p>
          </div>
          <CopyButton value={json} label="Copy JSON" />
        </div>
        {!hasResponseBody(endpoint.status_code) ? (
          <p className="border-b border-white/10 px-5 py-3 text-xs leading-5 text-amber-200">
            HTTP {endpoint.status_code} does not send a body. The JSON below is
            retained for use with other statuses.
          </p>
        ) : null}
        <pre className="max-h-[32rem] overflow-auto p-5 font-mono text-[13px] leading-6 text-slate-200">
          <code>{json}</code>
        </pre>
      </section>
      <section className="mt-6 rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold">Request preview</h2>
        <pre className="mt-3 overflow-auto font-mono text-xs leading-6 text-slate-300">
          <code>{`curl -X ${endpoint.method} '${url}'`}</code>
        </pre>
      </section>
      <section className="mt-6 rounded-xl border border-dashed border-white/15 p-5">
        <h2 className="text-sm font-semibold">Request history</h2>
        <p className="mt-2 text-sm text-slate-400">
          Request inspection will be available when request logging is enabled.
        </p>
      </section>
      <div className="mt-8 flex flex-col justify-between gap-5 border-t border-white/10 pt-6 sm:flex-row">
        <div>
          <EndpointToggle
            active={endpoint.is_active}
            action={toggleEndpointAction.bind(null, project.id, endpoint.id)}
          />
          <p className="mt-4 text-xs leading-6 text-slate-400">
            Created {formatDate(endpoint.created_at)}
            <br />
            Updated {formatDate(endpoint.updated_at)}
          </p>
        </div>
        <div>
          <DeleteDialog
            kind="endpoint"
            confirmation={`${endpoint.method} ${endpoint.path}`}
            action={deleteEndpointAction.bind(null, project.id, endpoint.id)}
          />
        </div>
      </div>
    </div>
  );
}
