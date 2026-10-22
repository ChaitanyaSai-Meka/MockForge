"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";

import type { AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = { status: "idle" };

type AuthAction = (
  state: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

export function AuthForm({
  mode,
  action,
  notice,
  disabled = false,
}: {
  mode: "login" | "signup";
  action: AuthAction;
  notice?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="mt-8 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          disabled={disabled || pending}
          autoComplete="email"
          defaultValue={state.email}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className="h-11 w-full rounded-xl border border-white/10 bg-[#0a0e13] px-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-300/50 focus:ring-3 focus:ring-emerald-300/8"
          placeholder="you@example.com"
        />
        {state.fieldErrors?.email?.[0] ? (
          <p id="email-error" className="mt-1.5 text-xs text-rose-300">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">
            Password
          </label>
          {!isLogin ? (
            <span className="text-xs text-slate-600">8 characters minimum</span>
          ) : null}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isLogin ? 1 : 8}
          maxLength={isLogin ? 1024 : 72}
          disabled={disabled || pending}
          autoComplete={isLogin ? "current-password" : "new-password"}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          className="h-11 w-full rounded-xl border border-white/10 bg-[#0a0e13] px-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-300/50 focus:ring-3 focus:ring-emerald-300/8"
          placeholder="••••••••"
        />
        {state.fieldErrors?.password?.[0] ? (
          <p id="password-error" className="mt-1.5 text-xs text-rose-300">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {state.message || notice ? (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-300/15 bg-emerald-300/7 text-emerald-200"
              : "border-rose-300/15 bg-rose-300/7 text-rose-200"
          }`}
        >
          {state.status === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{state.message ?? notice}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disabled || pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            {isLogin ? "Logging in…" : "Creating account…"}
          </>
        ) : (
          <>
            {isLogin ? "Log in" : "Create account"}
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        {isLogin ? "New to MockForge?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-medium text-emerald-300 transition hover:text-emerald-200"
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
