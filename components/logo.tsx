import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-white",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg border border-emerald-300/30 bg-emerald-400/10 shadow-[inset_0_0_18px_rgba(52,211,153,0.08)]">
        <span className="font-mono text-sm font-bold text-emerald-300">M</span>
      </span>
      MockForge
    </Link>
  );
}
