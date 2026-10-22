import { pathSchema } from "@/lib/validation";

export type MockTarget = { slug: string; path: string };
export type RequestProblem = {
  status: 400 | 414;
  code: "INVALID_REQUEST" | "URI_TOO_LONG";
  message: string;
};

type TargetResult =
  | { target: MockTarget; error?: never }
  | { target?: never; error: RequestProblem };

export function resolveMockTarget(
  url: string,
  segments?: string[],
): TargetResult {
  const parsedUrl = new URL(url);
  if (parsedUrl.search.length > 8192) {
    return {
      error: {
        status: 414,
        code: "URI_TOO_LONG",
        message: "The query string is too long.",
      },
    };
  }
  // Next.js decodes route params. Check the raw pathname as well so encoded
  // slashes or characters cannot become aliases for a different stored path.
  if (parsedUrl.pathname.includes("%")) {
    return {
      error: {
        status: 400,
        code: "INVALID_REQUEST",
        message: "Use an unencoded, URL-safe mock path.",
      },
    };
  }
  const slug = segments?.[0];
  if (
    !slug ||
    slug.length < 3 ||
    slug.length > 63 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return {
      error: {
        status: 400,
        code: "INVALID_REQUEST",
        message: "Include a valid project slug after /mock/.",
      },
    };
  }
  const rawPath = `/${segments!.slice(1).join("/")}`;
  if (rawPath.length > 200) {
    return {
      error: {
        status: 414,
        code: "URI_TOO_LONG",
        message: "The endpoint path is too long.",
      },
    };
  }
  const path = pathSchema.safeParse(rawPath);
  if (!path.success) {
    return {
      error: {
        status: 400,
        code: "INVALID_REQUEST",
        message: "Use an exact, URL-safe endpoint path.",
      },
    };
  }
  return { target: { slug, path: path.data } };
}

// Reflect header names only, never header values. Authorization must be named
// explicitly for CORS; Access-Control-Allow-Headers: * does not cover it.
export function preflightHeaders(value: string | null): string[] | null {
  if (!value) return [];
  if (value.length > 2048) return null;
  const names = value.split(",").map((name) => name.trim().toLowerCase());
  if (
    names.length > 32 ||
    names.some((name) => !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name))
  ) {
    return null;
  }
  return [...new Set(names)];
}
