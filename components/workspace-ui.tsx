import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

export const primaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50";
export const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#090d12] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/10 disabled:opacity-60";

export function WorkspaceHeader({
  title,
  description,
  backHref,
  backLabel = "Projects",
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 inline-block text-sm text-slate-400 hover:text-emerald-300"
        >
          ← {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
        ) : null}
      </div>
    </header>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-300/10 text-emerald-300",
    POST: "bg-sky-300/10 text-sky-300",
    PUT: "bg-amber-300/10 text-amber-300",
    PATCH: "bg-violet-300/10 text-violet-300",
    DELETE: "bg-rose-300/10 text-rose-300",
  };
  return (
    <span
      className={`inline-block shrink-0 rounded-md px-2 py-1 font-mono text-xs font-semibold ${colors[method] ?? "bg-white/5 text-slate-300"}`}
    >
      {method}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${active ? "text-emerald-300" : "text-slate-400"}`}
    >
      <span
        className={`size-1.5 rounded-full ${active ? "bg-emerald-300" : "bg-slate-500"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const notices: Record<string, string> = {
  "project-created": "Project created. Add your first endpoint below.",
  "project-updated": "Project updated.",
  "project-deleted": "Project and its endpoints deleted.",
  "endpoint-created": "Endpoint saved.",
  "endpoint-updated": "Endpoint updated.",
  "endpoint-deleted": "Endpoint deleted.",
};

export function SuccessNotice({ notice }: { notice?: string | string[] }) {
  const message = typeof notice === "string" ? notices[notice] : undefined;
  return message ? (
    <div
      role="status"
      className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200"
    >
      <CheckCircle2 className="size-4 shrink-0" />
      {message}
    </div>
  ) : null;
}

export function Pagination({
  page,
  count,
  pageSize,
  href,
}: {
  page: number;
  count: number;
  pageSize: number;
  href: string;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages === 1 && page === 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"
    >
      <span>
        {count.toLocaleString()} total · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={secondaryButton} href={`${href}?page=${page - 1}`}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className={secondaryButton} href={`${href}?page=${page + 1}`}>
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function formatDate(value: string): string {
  return (
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
