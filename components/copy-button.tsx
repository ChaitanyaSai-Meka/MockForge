"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { secondaryButton } from "@/components/workspace-ui";

export function CopyButton({
  value,
  label = "Copy URL",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={copy}
        onBlur={() => setStatus("idle")}
        className={secondaryButton}
      >
        {status === "copied" ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {status === "copied" ? "Copied" : label}
      </button>
      <span
        className={
          status === "failed" ? "mt-1 block text-xs text-rose-300" : "sr-only"
        }
        role="status"
      >
        {status === "failed"
          ? "Copy unavailable. Select and copy the text manually."
          : status === "copied"
            ? "Copied to clipboard."
            : ""}
      </span>
    </div>
  );
}
