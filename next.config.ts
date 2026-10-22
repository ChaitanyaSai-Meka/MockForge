import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Let mock requests with a trailing slash reach our normalizer directly,
  // including CORS preflights that must not be redirected first.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
