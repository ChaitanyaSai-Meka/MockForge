"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Endpoint } from "@/lib/database.types";
import { initialActionState, type ActionState } from "@/lib/action-state";
import {
  buildMockUrl,
  endpointSchema,
  hasResponseBody,
  HTTP_METHODS,
  parseJsonResponse,
  pathSchema,
} from "@/lib/validation";
import { FieldError, FormFeedback } from "@/components/form-feedback";
import {
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/workspace-ui";

export function EndpointForm({
  endpoint,
  projectId,
  slug,
  origin,
  action,
}: {
  endpoint?: Endpoint;
  projectId: string;
  slug: string;
  origin: string;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [method, setMethod] = useState(endpoint?.method ?? "GET");
  const [path, setPath] = useState(endpoint?.path ?? "/products");
  const [status, setStatus] = useState(String(endpoint?.status_code ?? 200));
  const [body, setBody] = useState(
    JSON.stringify(
      endpoint ? endpoint.response_body : { message: "Hello from MockForge" },
      null,
      2,
    ),
  );
  const [active, setActive] = useState(endpoint?.is_active ?? true);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [clientErrors, setClientErrors] =
    useState<ActionState["fieldErrors"]>();
  const [jsonFeedback, setJsonFeedback] = useState<string>();
  const errors = clientErrors ?? state.fieldErrors;
  const parsedPath = pathSchema.safeParse(path);
  const url = parsedPath.success
    ? buildMockUrl(origin, slug, parsedPath.data)
    : null;
  const cancelHref = `/dashboard/projects/${projectId}${endpoint ? `/endpoints/${endpoint.id}` : ""}`;

  function formatJson() {
    const result = parseJsonResponse(body);
    if (!result.success) {
      setJsonFeedback(result.error);
      return;
    }
    setBody(JSON.stringify(result.value, null, 2));
    setJsonFeedback("Valid JSON, formatted.");
  }

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="space-y-6 rounded-xl border border-white/10 bg-[#0c1117] p-5 sm:p-7"
      onSubmit={(event) => {
        const parsed = endpointSchema.safeParse({
          method,
          path,
          status_code: status,
          response_body: body,
          is_active: active,
        });
        if (!parsed.success) {
          event.preventDefault();
          setClientErrors(parsed.error.flatten().fieldErrors);
        } else setClientErrors(undefined);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div>
          <label htmlFor="method" className="mb-2 block text-sm font-medium">
            Method
          </label>
          <select
            id="method"
            name="method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            disabled={pending}
            className={`${inputClass} font-mono`}
            aria-describedby="method-error"
            aria-invalid={Boolean(errors?.method)}
          >
            {HTTP_METHODS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FieldError id="method-error" messages={errors?.method} />
        </div>
        <div>
          <label htmlFor="path" className="mb-2 block text-sm font-medium">
            Path
          </label>
          <input
            id="path"
            name="path"
            required
            maxLength={200}
            value={path}
            onChange={(event) => setPath(event.target.value)}
            disabled={pending}
            spellCheck={false}
            autoCapitalize="none"
            className={`${inputClass} font-mono`}
            aria-invalid={Boolean(errors?.path)}
            aria-describedby="path-help path-error"
          />
          <p id="path-help" className="mt-2 text-xs leading-5 text-slate-400">
            Exact, case-sensitive paths. Repeated and trailing slashes are
            normalized. No query strings, wildcards, or dynamic parameters.
          </p>
          <FieldError id="path-error" messages={errors?.path} />
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-medium text-slate-400">
          Generated URL preview
        </p>
        <p className="mt-2 break-all font-mono text-sm text-emerald-200">
          {url ?? "Enter a valid path to preview the URL."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Once saved and active, anyone with this URL can access its response.
        </p>
      </div>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="status_code"
            className="mb-2 block text-sm font-medium"
          >
            Response status
          </label>
          <input
            id="status_code"
            name="status_code"
            type="number"
            min={200}
            max={599}
            step={1}
            required
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={pending}
            className={inputClass}
            aria-invalid={Boolean(errors?.status_code)}
            aria-describedby="status-error"
          />
          <FieldError id="status-error" messages={errors?.status_code} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-4 sm:mt-7">
          <input
            type="checkbox"
            name="is_active"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={pending}
            className="mt-0.5 size-4 accent-emerald-400"
          />
          <span>
            <span className="text-sm font-medium">Active endpoint</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Inactive endpoints return 404.
            </span>
          </span>
        </label>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="response_body" className="text-sm font-medium">
            JSON response body
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={formatJson}
            className={secondaryButton}
          >
            Format JSON
          </button>
        </div>
        {!hasResponseBody(Number(status)) ? (
          <p className="mb-3 rounded-lg bg-amber-300/5 p-3 text-xs leading-5 text-amber-200">
            HTTP {status} does not send a response body. Your JSON is saved, but
            it will be omitted from responses with this status.
          </p>
        ) : null}
        <textarea
          id="response_body"
          name="response_body"
          required
          rows={16}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setJsonFeedback(undefined);
          }}
          disabled={pending}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className={`${inputClass} min-h-72 resize-y font-mono text-[13px] leading-6`}
          aria-invalid={Boolean(errors?.response_body)}
          aria-describedby="json-help json-error json-feedback"
        />
        <p id="json-help" className="mt-2 text-xs text-slate-400">
          Valid JSON, up to 64 KiB. Never put passwords, API keys, or other
          private data in mock responses.
        </p>
        <FieldError id="json-error" messages={errors?.response_body} />
        <p
          id="json-feedback"
          role="status"
          className="mt-2 text-xs text-slate-300"
        >
          {jsonFeedback}
        </p>
      </div>
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : endpoint ? "Save changes" : "Create endpoint"}
        </button>
        <Link className={secondaryButton} href={cancelHref}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
