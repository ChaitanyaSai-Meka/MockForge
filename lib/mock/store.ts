import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { RuntimeStore } from "@/lib/mock/handler";
import { HTTP_METHODS } from "@/lib/validation";

const LOOKUP_TIMEOUT_MS = 5_000;

export function createRuntimeStore(): RuntimeStore {
  // This client never inherits a caller's Authorization header or auth cookies.
  const supabase = createAdminClient();
  return {
    async findProject(slug) {
      const { data, error } = await supabase
        .from("mock_projects")
        .select("id")
        .eq("slug", slug)
        .abortSignal(AbortSignal.timeout(LOOKUP_TIMEOUT_MS))
        .maybeSingle();
      if (error) throw new Error("Project lookup unavailable.");
      return data;
    },
    async findEndpoints(projectId, path) {
      const { data, error } = await supabase
        .from("mock_endpoints")
        .select("id, method, status_code, response_body, is_active")
        .eq("project_id", projectId)
        .eq("path", path)
        .limit(HTTP_METHODS.length)
        .abortSignal(AbortSignal.timeout(LOOKUP_TIMEOUT_MS));
      if (error) throw new Error("Endpoint lookup unavailable.");
      return data ?? [];
    },
  };
}
