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
  
  // Build optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
    ],
  },
};

export default withPWAFn(nextConfig);
