"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { secondaryButton } from "@/components/workspace-ui";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={secondaryButton}
      disabled={pending}
      aria-label="Refresh requests"
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw
        aria-hidden="true"
        className={`size-4 ${pending ? "animate-spin" : ""}`}
      />
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
