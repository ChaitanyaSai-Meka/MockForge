"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useActionState } from "react";

import { signOutAction, type SignOutState } from "@/app/dashboard/actions";

export function SignOutButton() {
  const [state, action, pending] = useActionState<SignOutState, FormData>(signOutAction, {});

  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200 disabled:opacity-60">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error ? <p role="alert" className="px-3 py-2 text-xs text-rose-300">{state.error}</p> : null}
    </form>
  );
}
