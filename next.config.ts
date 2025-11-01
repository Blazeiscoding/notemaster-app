import type { NextConfig } from "next";
import withPWA from "next-pwa";

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
