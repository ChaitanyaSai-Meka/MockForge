import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { managementContext, pageNumber, PAGE_SIZE } from "@/lib/management";
import {
  formatDate,
  Pagination,
  primaryButton,
  SuccessNotice,
  WorkspaceHeader,
} from "@/components/workspace-ui";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; notice?: string }>;
}) {
  const { supabase, user } = await managementContext();
  const params = await searchParams;
  const page = pageNumber(params.page);
  const {
    data: projects,
    count,
    error,
  } = await supabase
    .from("mock_projects")
    .select("*, mock_endpoints(count)", { count: "exact" })
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Unable to load projects.");

  return (
    <div className="mx-auto max-w-7xl">
      <WorkspaceHeader
        title="Projects"
        description="Give each mock API a home for its endpoints."
      >
        <Link href="/dashboard/projects/new" className={primaryButton}>
          <Plus className="size-4" />
          New project
        </Link>
      </WorkspaceHeader>
      <SuccessNotice notice={params.notice} />
      {projects?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              href={`/dashboard/projects/${project.id}`}
              key={project.id}
              className="min-w-0 rounded-xl border border-white/10 bg-[#0c1117] p-5 transition hover:border-emerald-300/30"
            >
              <FolderKanban className="mb-5 size-5 text-emerald-300" />
              <h2 className="truncate text-lg font-semibold text-white">
                {project.name}
              </h2>
              <p className="mt-2 truncate font-mono text-xs text-slate-400">
                /mock/{project.slug}
              </p>
              <p className="mt-4 line-clamp-2 min-h-10 break-words text-sm leading-5 text-slate-400">
                {project.description ?? "No description yet."}
              </p>
              <div className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-400">
                <p>{project.mock_endpoints[0]?.count ?? 0} endpoints</p>
                <p className="mt-2">Created {formatDate(project.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
          <FolderKanban className="mx-auto size-8 text-slate-500" />
          <h2 className="mt-4 text-lg font-medium">
            {page > 1
              ? "No projects on this page"
              : "Create your first project"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {page > 1
              ? "Go back to an earlier page to see your projects."
              : "Organize related endpoints under a single project URL."}
          </p>
          <Link
            href={page > 1 ? "/dashboard/projects" : "/dashboard/projects/new"}
            className={`${primaryButton} mt-6`}
          >
            {page > 1 ? "Back to projects" : "Create project"}
          </Link>
        </div>
      )}
      <Pagination
        page={page}
        count={count ?? 0}
        pageSize={PAGE_SIZE}
        href="/dashboard/projects"
      />
    </div>
  );
}
