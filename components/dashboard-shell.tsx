import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/logo";
import { DashboardNavigation } from "@/components/dashboard-navigation";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080b0f] text-slate-100">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-300 focus:p-3 focus:text-black"
      >
        Skip to workspace
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/7 bg-[#090d12] lg:flex">
        <div className="flex h-16 items-center border-b border-white/7 px-5">
          <Logo href="/dashboard" />
        </div>

        <div className="flex-1 px-3 py-5">
          <p className="mb-3 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            Workspace
          </p>
          <DashboardNavigation />
        </div>

        <div className="border-t border-white/7 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-300/10 text-xs font-semibold uppercase text-emerald-300">
              {userEmail.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-300">
                {userEmail}
              </p>
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
                <DashboardNavigation />
                <div className="mt-1 border-t border-white/7 pt-1">
                  <SignOutButton />
                </div>
              </div>
            </details>
            <Logo href="/dashboard" className="text-sm" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-300">Workspace</p>
          </div>
          <p className="hidden max-w-64 truncate text-xs text-slate-400 sm:block">
            {userEmail}
          </p>
        </header>

        <main
          id="workspace"
          tabIndex={-1}
          className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
