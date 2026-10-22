"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-xl border border-rose-300/20 bg-rose-300/5 p-6">
      <h1 className="text-xl font-semibold text-white">Could not load your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Please try again in a moment.</p>
      <button onClick={reset} className="mt-5 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-black">Try again</button>
    </div>
  );
}
