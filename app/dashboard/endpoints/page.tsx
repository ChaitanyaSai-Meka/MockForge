import Link from "next/link";
import { managementContext, pageNumber, PAGE_SIZE } from "@/lib/management";
import { EndpointList } from "@/components/endpoint-list";
import {
  Pagination,
  primaryButton,
  WorkspaceHeader,
} from "@/components/workspace-ui";

export const metadata = { title: "Endpoints" };
export default async function EndpointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { supabase, user } = await managementContext();
  const page = pageNumber((await searchParams).page);
  const { data, count, error } = await supabase
    .from("mock_endpoints")
    .select(
      "id, project_id, method, path, status_code, is_active, mock_projects!inner(name, slug, owner_id)",
      { count: "exact" },
    )
    .eq("mock_projects.owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Unable to load endpoints.");
  return (
    <div className="mx-auto max-w-7xl">
      <WorkspaceHeader
        title="Endpoints"
        description="All endpoint configurations across your projects."
      >
        <Link href="/dashboard/projects" className={primaryButton}>
          Choose a project
        </Link>
      </WorkspaceHeader>
      {data?.length ? (
        <EndpointList endpoints={data} />
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
          <h2 className="text-lg font-medium">
            {page > 1 ? "No endpoints on this page" : "No endpoints yet"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Open a project to configure its first endpoint.
          </p>
          <Link href="/dashboard/projects" className={`${primaryButton} mt-5`}>
            View projects
          </Link>
        </div>
      )}
      <Pagination
        page={page}
        count={count ?? 0}
        pageSize={PAGE_SIZE}
        href="/dashboard/endpoints"
      />
    </div>
  );
}
