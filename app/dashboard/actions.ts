"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignOutState = { error?: string };

export async function signOutAction(): Promise<SignOutState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Could not sign out. Please try again." };
  } catch {
    return { error: "Could not sign out. Please try again." };
  }
  redirect("/login");
}
