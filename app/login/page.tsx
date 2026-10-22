import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { AuthSetupNotice } from "@/components/auth-setup-notice";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  const configured = isSupabaseConfigured();

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to manage your projects, endpoints, and request activity."
    >
      {!configured ? <AuthSetupNotice /> : null}
      <AuthForm
        disabled={!configured}
        mode="login"
        action={loginAction}
        notice={
          error === "confirmation_failed"
            ? "That confirmation link is invalid or expired. Try logging in if you already confirmed your email."
            : undefined
        }
      />
    </AuthShell>
  );
}
