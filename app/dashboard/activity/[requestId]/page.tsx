import Link from "next/link";
import { getRequestLog } from "@/lib/history";
import { CopyButton } from "@/components/copy-button";
import { ResponseStatus } from "@/components/request-history";
import {
  formatDate,
  MethodBadge,
  secondaryButton,
  WorkspaceHeader,
} from "@/components/workspace-ui";

export const metadata = { title: "Request details" };
export default async function RequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const record = await getRequestLog((await params).requestId);
  const endpoint = record.mock_endpoints;
  const json = JSON.stringify(record.query_params, null, 2);
  return (
    <div className="mx-auto max-w-4xl">
      <WorkspaceHeader
        title="Request details"
        description={endpoint.mock_projects.name}
        backHref={`/dashboard/activity?endpoint=${record.endpoint_id}`}
        backLabel="Endpoint history"
      >
        <Link
          className={secondaryButton}
          href={`/dashboard/projects/${endpoint.project_id}/endpoints/${record.endpoint_id}`}
        >
          View endpoint
        </Link>
      </WorkspaceHeader>
      <section className="rounded-xl border border-white/10 bg-[#0c1117] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <MethodBadge method={record.method} />
          <ResponseStatus status={record.status_code} />
        </div>
        <h2 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
          Requested path
        </h2>
        <p className="mt-2 break-all font-mono text-sm text-slate-100">
          {record.requested_path}
        </p>
        <dl className="mt-6 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Received at</dt>
            <dd className="mt-2 text-sm">
              <time dateTime={record.created_at} title={record.created_at}>
                {formatDate(record.created_at, true)}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">
              Response preparation time
            </dt>
            <dd className="mt-2 font-mono text-sm">{record.duration_ms} ms</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-400">Request ID</dt>
            <dd className="mt-2 break-all font-mono text-xs">{record.id}</dd>
          </div>
        </dl>
        <p className="mt-5 text-xs leading-6 text-slate-400">
          Timing includes endpoint lookup and response preparation, not network
          delivery or the background log write. The path is a snapshot from this
          call; the current endpoint may have changed.
        </p>
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0c1117]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <h2 className="text-sm font-medium">Retained query parameters</h2>
          <CopyButton value={json} label="Copy query JSON" />
        </div>
        <pre className="overflow-auto p-5 font-mono text-sm leading-6 text-slate-200">
          <code>{json}</code>
        </pre>
        <p className="border-t border-white/10 p-5 text-xs leading-6 text-slate-400">
          Only validated page, limit, offset, and order values are stored.
          Duplicate, unsupported, and sensitive values are omitted. Headers,
          cookies, and bodies are never recorded.
        </p>
      </section>
    </div>
  );
}
