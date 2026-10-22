import Link from "next/link";
import { Plus } from "lucide-react";
import { getProject, pageNumber, PAGE_SIZE } from "@/lib/management";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { DeleteDialog } from "@/components/delete-dialog";
import { EndpointList } from "@/components/endpoint-list";
import {
  formatDate,
  Pagination,
  primaryButton,
  secondaryButton,
  SuccessNotice,
  WorkspaceHeader,
} from "@/components/workspace-ui";
import { deleteProjectAction } from "@/app/dashboard/projects/actions";

export const metadata = { title: "Project" };
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string; notice?: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  const query = await searchParams;
  const page = pageNumber(query.page);
  const supabase = await createClient();
  const {
    data: endpoints,
    count,
    error,
  } = await supabase
    .from("mock_endpoints")
    .select("*", { count: "exact" })
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Unable to load endpoints.");
  const base = `/dashboard/projects/${project.id}`;
  const url = `${getSiteUrl()}/mock/${project.slug}`;
  return (
    <div className="mx-auto max-w-7xl">
      <WorkspaceHeader
        title={project.name}
        description={
          project.description ?? "Manage the endpoints in this project."
        }
        backHref="/dashboard/projects"
      >
        <Link className={secondaryButton} href={`${base}/edit`}>
          Edit project
        </Link>
        <Link className={primaryButton} href={`${base}/endpoints/new`}>
          <Plus className="size-4" />
          New endpoint
        </Link>
      </WorkspaceHeader>
      <SuccessNotice notice={query.notice} />
      <div className="mb-7 flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#0c1117] p-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Project URL prefix</p>
          <p className="mt-2 break-all font-mono text-sm text-emerald-200">
            {url}
          </p>
        </div>
        <CopyButton value={url} />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Endpoints{" "}
          <span className="ml-1 text-sm font-normal text-slate-400">
            {count ?? 0}
          </span>
        </h2>
        <span className="text-xs text-slate-400">
          Public responses · Private configuration
        </span>
      </div>
      {endpoints?.length ? (
        <EndpointList endpoints={endpoints} />
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
          <h3 className="text-lg font-medium">
            {page > 1
              ? "No endpoints on this page"
              : "Configure your first endpoint"}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Choose a method, path, HTTP status, and JSON response.
          </p>
          <Link
            href={page > 1 ? base : `${base}/endpoints/new`}
            className={`${primaryButton} mt-6`}
          >
            {page > 1 ? "Back to first page" : "Create endpoint"}
          </Link>
        </div>
      )}
      <Pagination
        page={page}
        count={count ?? 0}
        pageSize={PAGE_SIZE}
        href={base}
      />
      <footer className="mt-10 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
        <div className="text-xs leading-6 text-slate-400">
          <p>Created {formatDate(project.created_at)}</p>
          <p>Updated {formatDate(project.updated_at)}</p>
        </div>
        <DeleteDialog
          kind="project"
          confirmation={project.slug}
          action={deleteProjectAction.bind(null, project.id)}
        />
      </footer>
    </div>
  );
}
