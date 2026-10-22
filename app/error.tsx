"use client";

import Link from "next/link";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">We could not load this page. Please try again in a moment.</p>
      <div className="mt-6 flex items-center gap-5">
        <button onClick={reset} className="rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-black">Try again</button>
        <Link href="/" className="text-sm text-emerald-300">Back to home</Link>
      </div>
    </main>
  );
}
