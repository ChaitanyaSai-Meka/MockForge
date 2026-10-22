import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <DashboardShell userEmail={user.email ?? "MockForge user"}>
      {children}
    </DashboardShell>
  );
}
