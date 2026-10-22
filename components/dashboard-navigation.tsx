"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Braces, FolderKanban, LayoutDashboard } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Endpoints", href: "/dashboard/endpoints", icon: Braces },
  { label: "Activity", href: "/dashboard/activity", icon: Activity },
];

export function DashboardNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="space-y-1">
      {navigation.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={(event) =>
              event.currentTarget.closest("details")?.removeAttribute("open")
            }
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-emerald-300/8 font-medium text-emerald-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
