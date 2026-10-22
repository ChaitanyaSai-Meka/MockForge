import {
  ArrowRight,
  Braces,
  Check,
  Gauge,
  History,
  Layers3,
  MousePointerClick,
  Route,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";

const responseExample = `{
  "products": [
    {
      "id": 1,
      "name": "Mechanical Keyboard",
      "price": 129
    },
    {
      "id": 2,
      "name": "Studio Display",
      "price": 1599
    }
  ]
}`;

const features = [
  {
    icon: Route,
    title: "Shape any endpoint",
    description:
      "Choose an HTTP method, exact route, response status, and JSON body through a focused editor.",
  },
  {
    icon: Braces,
    title: "Return real JSON",
    description:
      "Use generated URLs directly from your frontend. Responses are loaded from PostgreSQL on every request.",
  },
  {
    icon: History,
    title: "Inspect every call",
    description:
      "Understand what your app requested with useful status, timing, query parameter, and timestamp details.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080b0f] text-slate-100">
      <SiteHeader />

      <section className="relative border-b border-white/6">
        <div className="pointer-events-none absolute inset-0 code-grid [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-20 lg:pb-32 lg:pt-28">
          <div className="min-w-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/7 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <Sparkles className="size-3.5" />
              Frontend progress, unblocked
            </div>

            <h1 className="text-balance max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.6rem]">
              Mock APIs that feel like the real thing.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg leading-8 text-slate-400 sm:text-xl">
              Create REST endpoints, craft JSON responses, and inspect requests in minutes—without waiting for backend code.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#07110d] shadow-[0_0_28px_rgba(52,211,153,0.18)] transition hover:bg-emerald-300"
              >
                Create your first mock
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400" /> No backend setup
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400" /> Real PostgreSQL persistence
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400" /> Built for frontend teams
              </span>
            </div>
          </div>

          <div className="relative mx-auto min-w-0 w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-400/[0.04] blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1117] shadow-2xl shadow-black/40">
              <div className="flex h-12 items-center justify-between border-b border-white/8 px-4">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-[11px] text-slate-500">response.json</span>
                <span className="font-mono text-[10px] text-slate-500">Example</span>
              </div>

              <div className="overflow-x-auto whitespace-nowrap border-b border-white/8 bg-[#090d12] px-4 py-3 font-mono text-xs sm:px-5 sm:text-sm">
                <span className="mr-3 rounded bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                  GET
                </span>
                <span className="text-slate-400">https://example.com/mock/</span>
                <span className="text-white">store/products</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-400 [animation:pulse-soft_2s_ease-in-out_infinite]" />
                  <span className="font-mono text-xs text-emerald-300">200 OK</span>
                </div>
                <span className="font-mono text-[11px] text-slate-600">application/json · 42ms</span>
              </div>

              <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-slate-300 sm:p-6 sm:text-[13px]">
                <code>{responseExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/6 bg-[#0a0e13] py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              From zero to endpoint
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              Three steps between an idea and working data
            </h2>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              {
                number: "01",
                icon: Layers3,
                title: "Create a project",
                copy: "Give your API a memorable, URL-safe home for all related endpoints.",
              },
              {
                number: "02",
                icon: MousePointerClick,
                title: "Configure a response",
                copy: "Choose the method, path, status code, and exact JSON your application expects.",
              },
              {
                number: "03",
                icon: Zap,
                title: "Call it immediately",
                copy: "Copy the generated public URL into your app and keep building without a backend dependency.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="group relative rounded-2xl border border-white/8 bg-white/[0.025] p-7 transition hover:border-emerald-300/20 hover:bg-white/[0.04]"
              >
                <span className="absolute right-6 top-5 font-mono text-xs text-slate-700">
                  {step.number}
                </span>
                <div className="grid size-10 place-items-center rounded-xl border border-white/8 bg-[#0c1117] text-emerald-300">
                  <step.icon className="size-4.5" />
                </div>
                <h3 className="mt-7 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                A focused toolkit
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Everything you need to stop faking the fake data
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                MockForge keeps endpoint configuration, reliable responses, and request visibility in one place—without adding another complicated platform to your stack.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="bg-[#0b0f14] p-6 sm:p-7">
                  <feature.icon className="size-5 text-emerald-300" />
                  <h3 className="mt-10 font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-16 grid gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:grid-cols-3 sm:p-7">
            {[
              { icon: Gauge, title: "Fast by default", copy: "Lean route handlers and indexed lookups." },
              { icon: ShieldCheck, title: "Private workspace", copy: "Server-verified auth and database RLS." },
              { icon: TerminalSquare, title: "Developer native", copy: "Straightforward URLs and honest JSON." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl px-2 py-3">
                <item.icon className="mt-0.5 size-4.5 shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-[#0a0e13] py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-8">
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Your frontend does not need to wait.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            Build against dependable mock endpoints today, then switch to production APIs when they are ready.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300"
          >
            Start building free
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo className="text-sm text-slate-400" />
        <p>Built for developers who would rather keep shipping.</p>
        <p>© {new Date().getFullYear()} MockForge</p>
      </footer>
    </main>
  );
}
