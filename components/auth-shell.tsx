import { Braces, Check, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-[#080b0f] text-white lg:grid-cols-[0.88fr_1.12fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <Logo />

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
            Developer workspace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
          {children}
        </div>

        <p className="text-xs text-slate-700">Protected by Supabase Auth</p>
      </section>

      <aside className="relative hidden overflow-hidden border-l border-white/6 bg-[#0a0e13] lg:block">
        <div className="absolute inset-0 code-grid opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[100px]" />

        <div className="relative flex h-full items-center justify-center p-14">
          <div className="w-full max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1016]/90 shadow-2xl shadow-black/40">
              <div className="flex h-12 items-center gap-2 border-b border-white/8 px-4">
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="ml-auto font-mono text-[10px] text-slate-600">mockforge</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-sky-400/10 px-2 py-1 font-mono text-[10px] font-semibold text-sky-300">
                    POST
                  </span>
                  <span className="font-mono text-sm text-slate-300">/api/checkout</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-400" /> Active
                  </span>
                </div>
                <div className="mt-5 rounded-xl border border-white/6 bg-black/20 p-4 font-mono text-xs leading-6 text-slate-400">
                  <p><span className="text-violet-300">{"{"}</span></p>
                  <p className="pl-4"><span className="text-sky-300">&quot;success&quot;</span>: <span className="text-amber-200">true</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">&quot;orderId&quot;</span>: <span className="text-emerald-200">&quot;ord_92xk1&quot;</span></p>
                  <p><span className="text-violet-300">{"}"}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <Braces className="size-4 text-emerald-300" />
                <p className="mt-3 text-sm font-medium text-slate-200">Exact JSON responses</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <LockKeyhole className="size-4 text-emerald-300" />
                <p className="mt-3 text-sm font-medium text-slate-200">Private management</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <Check className="size-3.5 text-emerald-400" />
              Public mock URLs, secure owner-only configuration
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
