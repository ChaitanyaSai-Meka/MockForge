import { randomBytes, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";

type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient<Database>;
};

function settings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !secret)
    throw new Error(
      "Live tests require the Supabase URL, public key, and server key in .env.local.",
    );
  return { url, key, secret };
}

export async function createFixtureUsers(count: number) {
  const { url, key, secret } = settings();
  const admin = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users: TestUser[] = [];
  async function cleanup() {
    for (const user of users) {
      // Only delete IDs created in this run, after verifying their identities.
      const { data, error } = await admin.auth.admin.getUserById(user.id);
      if (
        error ||
        data.user.email !== user.email ||
        !user.email.startsWith("mockforge-e2e-")
      ) {
        throw new Error("Could not verify a fixture user for cleanup.");
      }
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw new Error("Could not clean up a fixture user.");
    }
  }
  try {
    for (let index = 0; index < count; index++) {
      const email = `mockforge-e2e-${randomUUID()}@example.invalid`;
      const password = randomBytes(24).toString("hex");
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error || !created.data.user)
        throw new Error(
          `Fixture creation failed (${created.error?.code ?? "unknown"}).`,
        );
      const client = createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      users.push({ id: created.data.user.id, email, password, client });
      const signedIn = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (signedIn.error) throw new Error("Fixture login failed.");
    }
    return { users, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}
