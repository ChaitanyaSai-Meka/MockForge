import Link from "next/link";
import {
  getHistoryEndpoint,
  getHistoryFilters,
  getRequestHistory,
} from "@/lib/history";
import { PAGE_SIZE } from "@/lib/management";
import { RequestHistory } from "@/components/request-history";
import { RefreshButton } from "@/components/refresh-button";
import {
  inputClass,
  Pagination,
  primaryButton,
  secondaryButton,
  WorkspaceHeader,
} from "@/components/workspace-ui";
import { notFound } from "next/navigation";

export const metadata = { title: "Request activity" };
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    endpoint?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  if (Array.isArray(params.endpoint)) notFound();
  const endpointId = params.endpoint || undefined;
  const selected = endpointId ? await getHistoryEndpoint(endpointId) : null;
  const [history, filters] = await Promise.all([
    getRequestHistory(endpointId, params.page),
    getHistoryFilters(),
  ]);
  if (selected && !filters.some((endpoint) => endpoint.id === selected.id))
    filters.unshift(selected);
  const href = `/dashboard/activity${endpointId ? `?endpoint=${endpointId}` : ""}`;
  return (
    <div className="mx-auto max-w-5xl">
      <WorkspaceHeader
        title="Request activity"
        description="Inspect incoming calls to your mock endpoints. Only you can see this history."
      >
        <RefreshButton />
      </WorkspaceHeader>
      <form
        action="/dashboard/activity"
        className="mb-6 rounded-xl border border-white/10 bg-[#0c1117] p-4 sm:p-5"
      >
        <label
          htmlFor="endpoint-filter"
          className="mb-2 block text-sm font-medium"
        >
          Filter by endpoint
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            id="endpoint-filter"
            name="endpoint"
            defaultValue={endpointId ?? ""}
            className={`${inputClass} min-w-0 flex-1`}
          >
            <option value="">All endpoints</option>
            {filters.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.mock_projects.name} · {endpoint.method}{" "}
                {endpoint.path}
              </option>
            ))}
          </select>
          <button className={primaryButton}>Apply filter</button>
          {selected ? (
            <Link className={secondaryButton} href="/dashboard/activity">
              Clear
            </Link>
          ) : null}
        </div>
        {filters.length >= 50 ? (
          <p className="mt-3 text-xs text-slate-400">
            Showing 50 recently updated endpoints and your selection. You can
            also open any endpoint to view its history.
          </p>
        ) : null}
      </form>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>
          {history.count.toLocaleString()} recorded{" "}
          {history.count === 1 ? "request" : "requests"}
        </p>
        {selected ? (
          <Link
            className="text-emerald-300 hover:underline"
            href={`/dashboard/projects/${selected.project_id}/endpoints/${selected.id}`}
          >
            View endpoint →
          </Link>
        ) : null}
      </div>
      <RequestHistory records={history.records} page={history.page} />
      <Pagination
        page={history.page}
        count={history.count}
        pageSize={PAGE_SIZE}
        href={href}
      />
      <p className="mt-6 text-xs leading-6 text-slate-400">
        Metadata only: no headers, cookies, or request/response bodies. Only
        validated page, limit, offset, and order query values are retained.
        Preflights and unmatched calls are not recorded.
      </p>
    </div>
  );
}
