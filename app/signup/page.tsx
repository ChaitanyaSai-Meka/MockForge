import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signupAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { AuthSetupNotice } from "@/components/auth-setup-notice";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const configured = isSupabaseConfigured();
  return (
    <AuthShell
      title="Create your workspace"
      description="Start building dependable mock endpoints for your frontend projects."
    >
      {!configured ? <AuthSetupNotice /> : null}
      <AuthForm mode="signup" action={signupAction} disabled={!configured} />
    </AuthShell>
  );
}
