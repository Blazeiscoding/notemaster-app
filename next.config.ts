import type { NextConfig } from "next";

/**
 * Service worker wiring lives outside this file.
 *
 * This project previously used `next-pwa`, a webpack plugin. Next 16 builds
 * with Turbopack, so the plugin never ran and no service worker was emitted at
 * all — silently disabling offline page loads, the /offline fallback, runtime
 * caching, and install prompts (Chrome will not fire `beforeinstallprompt`
 * without a fetch-handling worker).
 *
 * The worker is now built by Serwist in "configurator mode", which is
 * Turbopack-compatible: `serwist.config.mjs` drives a `serwist build` step run
 * after `next build` (see the `build` script), the caching strategies live in
 * `app/sw.ts`, and registration happens via `<SerwistProvider>` in the layout.
 */
const nextConfig: NextConfig = {
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
    // Skip Next.js optimization for ImageKit (they have their own CDN optimization)
    unoptimized: process.env.NODE_ENV === "development",
    // Increase timeout for slow connections
    minimumCacheTTL: 60,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
      "date-fns",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-code-block-lowlight",
      "@tiptap/extension-image",
      "@tiptap/extension-placeholder",
      "jspdf",
      "imagekit-javascript",
      "sonner",
    ],
  },
};

export default nextConfig;
