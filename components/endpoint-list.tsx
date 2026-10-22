import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Endpoint } from "@/lib/database.types";
import { MethodBadge, StatusBadge } from "@/components/workspace-ui";

export function EndpointList({
  endpoints,
}: {
  endpoints: Array<
    Pick<
      Endpoint,
      "id" | "project_id" | "method" | "path" | "status_code" | "is_active"
    > & { mock_projects?: { name: string; slug: string } | null }
  >;
}) {
  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0c1117]">
      {endpoints.map((endpoint) => (
        <Link
          key={endpoint.id}
          href={`/dashboard/projects/${endpoint.project_id}/endpoints/${endpoint.id}`}
          className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-white/[0.025] sm:flex-nowrap sm:p-5"
        >
          <MethodBadge method={endpoint.method} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-slate-100">
              {endpoint.path}
            </p>
            {endpoint.mock_projects ? (
              <p className="mt-1 truncate text-xs text-slate-400">
                {endpoint.mock_projects.name}
              </p>
            ) : null}
          </div>
          <span className="font-mono text-xs text-slate-400">
            {endpoint.status_code}
          </span>
          <StatusBadge active={endpoint.is_active} />
          <ArrowUpRight className="hidden size-4 text-slate-500 sm:block" />
        </Link>
      ))}
    </div>
  );
}
