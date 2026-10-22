import Link from "next/link";
import { primaryButton } from "@/components/workspace-ui";

export default function WorkspaceNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold">This item is not available</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        It may have been deleted, or you may not have access to it.
      </p>
      <Link className={`${primaryButton} mt-6`} href="/dashboard/projects">
        Back to projects
      </Link>
    </div>
  );
}
