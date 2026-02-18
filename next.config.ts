import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = ((nextPWA as unknown as { default?: unknown }).default ?? nextPWA) as (
  options?: Record<string, unknown>
) => (config: NextConfig) => NextConfig;

// Runtime caching strategies for PWA
const runtimeCaching = [
  {
    // Cache images with CacheFirst strategy
    urlPattern: /^https:\/\/ik\.imagekit\.io\/.*$/,
    handler: "CacheFirst",
    options: {
      cacheName: "imagekit-cache",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    // Cache static assets with StaleWhileRevalidate
    urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-assets",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      },
    },
  },
  {
    // Cache page navigation with NetworkFirst
    urlPattern: /^https?:\/\/.*\/(?!api\/).*$/,
    handler: "NetworkFirst",
    options: {
      cacheName: "pages-cache",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
];

const withPWAFn = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
  fallbacks: {
    document: "/offline", // Offline fallback page (optional)
  },
  // Enable background sync for offline operations
  buildExcludes: [/middleware-manifest\.json$/],
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
      "sonner",
    ],
  },
};

export default withPWAFn(nextConfig);
