import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Route trailing slashes directly so CORS preflights aren't redirected.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
