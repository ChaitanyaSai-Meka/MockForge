export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the application's canonical origin.");
  }
  const url = new URL(configuredUrl ?? "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path.");
  }
  return url.origin;
}
