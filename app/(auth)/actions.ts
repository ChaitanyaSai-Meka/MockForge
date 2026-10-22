"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/utils";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  email?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(1024),
});

const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

const unavailableMessage = "Authentication is currently unavailable. Please try again later.";

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      email: String(formData.get("email") ?? ""),
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return { status: "error", message: unavailableMessage, email: result.data.email };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(result.data);

    if (error) {
      return {
        status: "error",
        message: error.status === 429
          ? "Too many attempts. Wait a moment and try again."
          : error.status && error.status >= 500
            ? unavailableMessage
            : "Unable to log in. Check your email, password, and email confirmation.",
        email: result.data.email,
      };
    }
  } catch {
    return {
      status: "error",
      message: unavailableMessage,
      email: result.data.email,
    };
  }

  redirect("/dashboard");
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      email: String(formData.get("email") ?? ""),
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return { status: "error", message: unavailableMessage, email: result.data.email };
  }

  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...result.data,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    if (error) {
      return {
        status: "error",
        message: error.status === 429
          ? "Too many attempts. Wait a moment and try again."
          : "We could not create your account. Please try again.",
        email: result.data.email,
      };
    }
    hasSession = Boolean(data.session);
  } catch {
    return {
      status: "error",
      message: unavailableMessage,
      email: result.data.email,
    };
  }

  if (hasSession) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Check your inbox to confirm your email, then log in.",
    email: result.data.email,
  };
}
