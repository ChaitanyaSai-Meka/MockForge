import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import type { RequestSummary } from "@/lib/history";
import { formatDate, MethodBadge } from "@/components/workspace-ui";

export function ResponseStatus({ status }: { status: number }) {
  return (
    <span
      className={`font-mono text-xs font-semibold ${status >= 500 ? "text-rose-300" : status >= 400 ? "text-amber-300" : status >= 300 ? "text-sky-300" : "text-emerald-300"}`}
    >
      HTTP {status}
    </span>
  );
}

export function RequestHistory({
  records,
  page = 1,
}: {
  records: RequestSummary[];
  page?: number;
}) {
  if (!records.length)
    return (
      <div className="rounded-xl border border-dashed border-white/15 px-5 py-12 text-center">
        <Activity
          className="mx-auto size-6 text-slate-500"
          aria-hidden="true"
        />
        <h3 className="mt-4 text-base font-medium">
          {page > 1 ? "No requests on this page" : "No requests recorded yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Call a configured mock URL, then refresh. Logs may take a moment to
          appear after the response.
        </p>
      </div>
    );
  return (
    <ul
      aria-label="Request history"
      className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0c1117]"
    >
      {records.map((record) => (
        <li key={record.id}>
          <Link
            href={`/dashboard/activity/${record.id}`}
            className="block p-4 transition hover:bg-white/[0.03] sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={record.method} />
              <ResponseStatus status={record.status_code} />
              <span className="ml-auto font-mono text-xs text-slate-400">
                {record.duration_ms} ms
              </span>
              <ArrowUpRight
                className="size-4 text-slate-500"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 break-all font-mono text-sm text-slate-200">
              {record.requested_path}
            </p>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs leading-5 text-slate-400">
              <span className="break-words">
                {record.mock_endpoints.mock_projects.name}
              </span>
              <time dateTime={record.created_at} title={record.created_at}>
                {formatDate(record.created_at, true)}
              </time>
            </div>
            <span className="sr-only">Inspect request {record.id}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
