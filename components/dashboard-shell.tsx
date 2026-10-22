import {
  Activity,
  Braces,
  FolderKanban,
  LayoutDashboard,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/logo";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: FolderKanban, active: false },
  { label: "Endpoints", icon: Braces, active: false },
  { label: "Activity", icon: Activity, active: false },
];

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080b0f] text-slate-100">
      <a href="#workspace" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-300 focus:p-3 focus:text-black">Skip to workspace</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/7 bg-[#090d12] lg:flex">
        <div className="flex h-16 items-center border-b border-white/7 px-5">
          <Logo href="/dashboard" />
        </div>

        <nav aria-label="Workspace" className="flex-1 space-y-1 px-3 py-5">
          <p className="mb-3 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            Workspace
          </p>
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.active ? "/dashboard" : "#"}
              aria-disabled={!item.active || undefined}
              tabIndex={item.active ? undefined : -1}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                item.active
                  ? "bg-emerald-300/8 font-medium text-emerald-200"
                  : "pointer-events-none text-slate-500"
              }`}
              aria-current={item.active ? "page" : undefined}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
              {!item.active ? (
                <span className="ml-auto rounded border border-white/6 px-1.5 py-0.5 font-mono text-[8px] uppercase text-slate-700">
                  Soon
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/7 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-300/10 text-xs font-semibold uppercase text-emerald-300">
              {userEmail.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-300">{userEmail}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">Authenticated</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/7 bg-[#080b0f]/85 px-5 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <details className="relative">
              <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-white/8 text-slate-400 [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Open navigation</span>
                <Menu className="size-4" />
              </summary>
              <div className="absolute left-0 top-12 w-60 rounded-xl border border-white/10 bg-[#0c1117] p-2 shadow-2xl shadow-black/50">
                {navigation.map((item) => (
                  <Link
                    key={item.label}
                    href={item.active ? "/dashboard" : "#"}
                    aria-current={item.active ? "page" : undefined}
                    aria-disabled={!item.active || undefined}
                    tabIndex={item.active ? undefined : -1}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      item.active ? "bg-emerald-300/8 text-emerald-200" : "pointer-events-none text-slate-600"
                    }`}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {!item.active ? (
                      <span className="ml-auto font-mono text-[8px] uppercase">Soon</span>
                    ) : null}
                  </Link>
                ))}
                <div className="mt-1 border-t border-white/7 pt-1"><SignOutButton /></div>
              </div>
            </details>
            <Logo href="/dashboard" className="text-sm" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-300">Overview</p>
          </div>
          <p className="hidden max-w-64 truncate text-xs text-slate-400 sm:block">{userEmail}</p>
        </header>

        <main id="workspace" tabIndex={-1} className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
