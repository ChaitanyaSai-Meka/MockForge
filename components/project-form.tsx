"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Project } from "@/lib/database.types";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { projectSchema, suggestSlug } from "@/lib/validation";
import { FieldError, FormFeedback } from "@/components/form-feedback";
import {
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/workspace-ui";

export function ProjectForm({
  project,
  origin,
  action,
}: {
  project?: Project;
  origin: string;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [editedSlug, setEditedSlug] = useState(Boolean(project));
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [clientErrors, setClientErrors] =
    useState<ActionState["fieldErrors"]>();
  const errors = clientErrors ?? state.fieldErrors;
  const cancelHref = project
    ? `/dashboard/projects/${project.id}`
    : "/dashboard/projects";

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="max-w-2xl space-y-6 rounded-xl border border-white/10 bg-[#0c1117] p-5 sm:p-7"
      onSubmit={(event) => {
        const parsed = projectSchema.safeParse({ name, slug, description });
        if (!parsed.success) {
          event.preventDefault();
          setClientErrors(parsed.error.flatten().fieldErrors);
        } else setClientErrors(undefined);
      }}
    >
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Project name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!editedSlug) setSlug(suggestSlug(event.target.value));
          }}
          disabled={pending}
          placeholder="Storefront API"
          className={inputClass}
          aria-invalid={Boolean(errors?.name)}
          aria-describedby="name-error"
        />
        <FieldError id="name-error" messages={errors?.name} />
      </div>
      <div>
        <label
          htmlFor="slug"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          URL slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          minLength={3}
          maxLength={63}
          value={slug}
          onChange={(event) => {
            setEditedSlug(true);
            setSlug(event.target.value);
          }}
          disabled={pending}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="storefront-api"
          className={`${inputClass} font-mono`}
          aria-invalid={Boolean(errors?.slug)}
          aria-describedby="slug-help slug-error"
        />
        <p
          id="slug-help"
          className="mt-2 break-all font-mono text-xs text-slate-400"
        >
          {origin}/mock/{slug || "your-project"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Slugs are unique across MockForge. Use lowercase letters, numbers, and
          hyphens.
        </p>
        <FieldError id="slug-error" messages={errors?.slug} />
        {project && slug !== project.slug ? (
          <p
            role="status"
            className="mt-3 rounded-lg bg-amber-300/5 p-3 text-xs leading-5 text-amber-200"
          >
            Changing the slug changes every endpoint URL in this project.
            Applications using the old URLs will need updating.
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Description{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
          placeholder="Mock responses for the storefront frontend."
          className={inputClass}
          aria-invalid={Boolean(errors?.description)}
          aria-describedby="description-error"
        />
        <FieldError id="description-error" messages={errors?.description} />
      </div>
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : project ? "Save changes" : "Create project"}
        </button>
        <Link className={secondaryButton} href={cancelHref}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
