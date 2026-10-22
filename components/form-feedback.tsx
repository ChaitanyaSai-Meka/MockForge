import type { ActionState } from "@/lib/action-state";

export function FieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  return messages?.[0] ? (
    <p id={id} role="alert" className="mt-1.5 text-xs text-rose-300">
      {messages[0]}
    </p>
  ) : null;
}

export function FormFeedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-3 text-sm ${state.status === "error" ? "border-rose-300/20 bg-rose-300/5 text-rose-200" : "border-emerald-300/20 bg-emerald-300/5 text-emerald-200"}`}
    >
      {state.message}
    </p>
  );
}
