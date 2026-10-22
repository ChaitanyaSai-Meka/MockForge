import { z } from "zod";

import type { Json } from "@/lib/database.types";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export const MAX_RESPONSE_BYTES = 65_536;
export const idSchema = z.uuid();

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(80, "Use 80 characters or fewer."),
  slug: z.string().trim().min(3, "Use at least 3 characters.").max(63, "Use 63 characters or fewer.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens between words."),
  description: z.string().trim().max(500, "Use 500 characters or fewer.").transform((value) => value || null),
});

export function suggestSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63).replace(/-$/, "");
}

export function normalizePath(path: string): string {
  return path.trim().replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

export const pathSchema = z.string().trim()
  .min(1, "Enter a path starting with /.")
  .max(200, "Use 200 characters or fewer.")
  .regex(/^\/[A-Za-z0-9._~\/-]*$/, "Start with /. Use letters, numbers, /, -, _, ., or ~; no query strings or dynamic parameters.")
  .refine((value) => !value.split("/").some((part) => part === "." || part === ".."), "Paths cannot contain . or .. segments.")
  .transform(normalizePath);

export type JsonResult = { success: true; value: Json } | { success: false; error: string };

export function parseJsonResponse(text: string): JsonResult {
  if (!text.trim()) return { success: false, error: "Enter a JSON response body." };
  if (new TextEncoder().encode(text).length > MAX_RESPONSE_BYTES) {
    return { success: false, error: "Keep the JSON response within 64 KiB." };
  }
  let value: Json;
  try {
    value = JSON.parse(text) as Json;
  } catch {
    return { success: false, error: "Invalid JSON. Check quotes, commas, and brackets." };
  }

  // JSON.parse accepts values PostgreSQL JSONB cannot represent, including
  // non-finite numbers, NUL characters, and unpaired Unicode surrogates.
  const stack: Array<{ value: Json; depth: number }> = [{ value, depth: 0 }];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.depth > 64) return { success: false, error: "JSON must not exceed 64 levels of nesting." };
    if (typeof current.value === "number" && (!Number.isFinite(current.value) || (Number.isInteger(current.value) && !Number.isSafeInteger(current.value)))) {
      return { success: false, error: "Use finite numbers and safe integers. Put very large IDs in quotes." };
    }
    if (typeof current.value === "string" && (current.value.includes("\0") || !current.value.isWellFormed())) {
      return { success: false, error: "JSON strings must use valid Unicode without NUL characters." };
    }
    if (current.value !== null && typeof current.value === "object") {
      for (const [key, child] of Object.entries(current.value)) {
        stack.push({ value: key, depth: current.depth }, { value: child, depth: current.depth + 1 });
      }
    }
  }

  // Account for JSONB's spaces after commas/colons, without counting punctuation
  // inside strings. The database also enforces the final serialized size.
  const compact = JSON.stringify(value);
  let inString = false;
  let escaped = false;
  let spaces = 0;
  for (const char of compact) {
    if (escaped) { escaped = false; continue; }
    if (inString && char === "\\") { escaped = true; continue; }
    if (char === '"') inString = !inString;
    if (!inString && (char === "," || char === ":")) spaces++;
  }
  if (new TextEncoder().encode(compact).length + spaces > MAX_RESPONSE_BYTES) {
    return { success: false, error: "Keep the stored JSON response within 64 KiB." };
  }
  return { success: true, value };
}

export const endpointSchema = z.object({
  method: z.enum(HTTP_METHODS, { error: "Choose GET, POST, PUT, PATCH, or DELETE." }),
  path: pathSchema,
  status_code: z.string().regex(/^\d{3}$/, "Enter a three-digit HTTP status.").transform(Number)
    .pipe(z.number().int().min(200, "Choose a status from 200 to 599.").max(599, "Choose a status from 200 to 599.")),
  response_body: z.string().transform((text, context) => {
    const result = parseJsonResponse(text);
    if (!result.success) {
      context.addIssue({ code: "custom", message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
  is_active: z.boolean(),
});

export function buildMockUrl(origin: string, slug: string, path: string): string {
  return `${origin.replace(/\/$/, "")}/mock/${slug}${path === "/" ? "" : path}`;
}

export function hasResponseBody(status: number): boolean {
  return ![204, 205, 304].includes(status);
}
