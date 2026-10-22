import Link from "next/link";

import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-[#080b0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm text-slate-400 sm:flex">
          <Link className="transition hover:text-white" href="#how-it-works">
            How it works
          </Link>
          <Link className="transition hover:text-white" href="#features">
            Features
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:px-3 sm:text-sm"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-lg bg-emerald-400 px-2.5 py-2 text-xs font-semibold text-[#07110d] transition hover:bg-emerald-300 sm:px-3.5 sm:text-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
