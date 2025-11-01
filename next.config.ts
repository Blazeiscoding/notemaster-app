import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = ((nextPWA as unknown as { default?: unknown }).default ?? nextPWA) as (
  options?: Record<string, unknown>
) => (config: NextConfig) => NextConfig;

const withPWAFn = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Enable Turbopack with default settings; required when a webpack plugin is present
  // so Next doesn't error out.
  // Turbopack is used in dev; next-pwa augments webpack only for prod builds.
  turbopack: {},
};

export default withPWAFn(nextConfig);
