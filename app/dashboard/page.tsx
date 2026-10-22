import {
  Activity,
  ArrowUpRight,
  Braces,
  CircleAlert,
  FolderKanban,
  Globe2,
  LockKeyhole,
  Plus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type RecentEndpoint = {
  id: string;
  method: string;
  path: string;
  is_active: boolean;
  updated_at: string;
  mock_projects: { name: string; slug: string } | null;
};

function methodBadge(method: string) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-300/10 text-emerald-300",
    POST: "bg-sky-300/10 text-sky-300",
    PUT: "bg-amber-300/10 text-amber-300",
    PATCH: "bg-violet-300/10 text-violet-300",
    DELETE: "bg-rose-300/10 text-rose-300",
  };

  return colors[method] ?? "bg-white/5 text-slate-300";
}

export default async function DashboardPage() {
  // Pages and layouts may render in parallel; guard the data read itself.
  await requireUser();
  const supabase = await createClient();

  const [projectsResult, endpointsResult, logsResult, recentResult] =
    await Promise.all([
      supabase
        .from("mock_projects")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("mock_endpoints")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("request_logs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("mock_endpoints")
        .select(
          "id, method, path, is_active, updated_at, mock_projects(name, slug)",
        )
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const hasDatabaseError = Boolean(
    projectsResult.error ||
      endpointsResult.error ||
      logsResult.error ||
      recentResult.error,
  );

  const projectCount = projectsResult.count ?? 0;
  const endpointCount = endpointsResult.count ?? 0;
  const requestCount = logsResult.count ?? 0;
  const recentEndpoints = (recentResult.data ?? []) as unknown as RecentEndpoint[];

  const stats = [
    { label: "Projects", value: projectCount, icon: FolderKanban },
    { label: "Endpoints", value: endpointCount, icon: Braces },
    { label: "Recorded requests", value: requestCount, icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
            Your API workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track your mock projects, endpoints, and incoming requests.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Project creation is coming soon"
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-[#07110d] opacity-55 sm:self-auto"
        >
          <Plus className="size-4" />
          New project
          <span className="ml-1 rounded bg-black/10 px-1.5 py-0.5 font-mono text-[8px] uppercase">
            Soon
          </span>
        </button>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-300/12 bg-amber-300/[0.045] px-4 py-3.5">
        <Globe2 className="mt-0.5 size-4 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-medium text-amber-100">Mock responses are public</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/55">
            Anyone with a generated mock URL can access its configured response. Your dashboard and configuration remain owner-protected.
          </p>
        </div>
      </div>

      {hasDatabaseError ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-300/12 bg-rose-300/[0.045] px-4 py-3.5">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
          <div>
            <p className="text-sm font-medium text-rose-100">Workspace data is unavailable</p>
            <p className="mt-1 text-xs leading-5 text-rose-100/55">
              We could not load your workspace. Try reloading the page. If this is a new installation, check the database setup in the README.
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-white/7 bg-[#0c1117] p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <span className="grid size-8 place-items-center rounded-lg border border-white/6 bg-white/[0.025] text-slate-500">
                <stat.icon className="size-4" />
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white">
              {hasDatabaseError ? "—" : stat.value.toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-white/7 bg-[#0c1117]">
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Recent endpoints</h2>
            <p className="mt-1 text-xs text-slate-600">Latest configuration activity</p>
          </div>
          <span className="text-xs text-slate-700">Owner-visible only</span>
        </div>

        {recentResult.error ? (
          <p role="status" className="px-5 py-14 text-center text-sm text-slate-400">
            Recent endpoints could not be loaded. Try again in a moment.
          </p>
        ) : recentEndpoints.length > 0 ? (
          <div className="divide-y divide-white/6">
            {recentEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span
                  className={`w-14 rounded-md px-2 py-1 text-center font-mono text-[10px] font-bold ${methodBadge(endpoint.method)}`}
                >
                  {endpoint.method}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-slate-300">
                    /mock/{endpoint.mock_projects?.slug ?? "project"}
                    {endpoint.path}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {endpoint.mock_projects?.name ?? "Project"} · {endpoint.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-slate-700" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-xl border border-white/7 bg-white/[0.025] text-slate-600">
              <Braces className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-medium text-slate-300">No endpoints yet</h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
              Your endpoint activity will appear here once you add your first project. Project and endpoint creation are coming soon.
            </p>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/7 bg-[#0c1117] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-300/8 text-emerald-300">
              <LockKeyhole className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-300">Owner-scoped data</p>
              <p className="mt-0.5 text-xs text-slate-600">Protected with PostgreSQL row-level security</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/7 bg-[#0c1117] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-sky-300/8 text-sky-300">
              <Activity className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-300">Live statistics</p>
              <p className="mt-0.5 text-xs text-slate-600">Counts are queried from your Supabase database</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
