"use client";

import { useActionState } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { secondaryButton } from "@/components/workspace-ui";
import { FormFeedback } from "@/components/form-feedback";

export function EndpointToggle({
  active,
  action,
}: {
  active: boolean;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-2" aria-busy={pending}>
      <input name="is_active" type="hidden" value={String(!active)} />
      <button type="submit" disabled={pending} className={secondaryButton}>
        {pending ? "Saving…" : active ? "Disable endpoint" : "Enable endpoint"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}
