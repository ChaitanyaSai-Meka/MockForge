"use client";

import { useActionState, useId, useRef } from "react";
import { Trash2 } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { inputClass, secondaryButton } from "@/components/workspace-ui";
import { FormFeedback } from "@/components/form-feedback";

export function DeleteDialog({
  kind,
  confirmation,
  action,
}: {
  kind: "project" | "endpoint";
  confirmation: string;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          cancelButton.current?.focus({ preventScroll: true });
        }}
        className={`${secondaryButton} text-rose-300`}
      >
        <Trash2 className="size-4" />
        Delete {kind}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-white/15 bg-[#11171f] p-6 text-slate-100 shadow-2xl backdrop:bg-black/75"
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          Delete this {kind}?
        </h2>
        <p
          id={`${id}-description`}
          className="mt-3 text-sm leading-6 text-slate-400"
        >
          {kind === "project"
            ? "This permanently deletes the project, all its endpoints, and their request logs."
            : "This permanently deletes the endpoint and its request logs."}{" "}
          This cannot be undone.
        </p>
        <form
          action={formAction}
          className="mt-5 space-y-4"
          aria-busy={pending}
        >
          <label htmlFor={`${id}-confirmation`} className="block text-sm">
            Type{" "}
            <strong className="break-all font-mono text-rose-200">
              {confirmation}
            </strong>{" "}
            to confirm.
          </label>
          <input
            id={`${id}-confirmation`}
            name="confirmation"
            required
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
            className={`${inputClass} font-mono`}
          />
          <FormFeedback state={state} />
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              ref={cancelButton}
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className={secondaryButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-60"
            >
              {pending ? "Deleting…" : `Delete ${kind}`}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
