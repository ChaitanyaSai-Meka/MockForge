export default function DashboardLoading() {
  return (
    <div role="status" className="mx-auto max-w-7xl motion-safe:animate-pulse">
      <span className="sr-only">Loading workspace…</span>
      <div className="h-8 w-56 rounded-lg bg-white/10" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-36 rounded-xl border border-white/10 bg-white/5" />)}
      </div>
      <div className="mt-6 h-64 rounded-xl border border-white/10 bg-white/5" />
    </div>
  );
}
