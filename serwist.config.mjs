import { serwist } from "@serwist/next/config";

/**
 * Serwist "configurator mode" build config.
 *
 * The service worker is built by `serwist build` as a separate step after
 * `next build` (see the `build` script in package.json), because the plugin
 * form of @serwist/next only hooks into webpack and this project builds with
 * Turbopack.
 */
export default serwist.withNextConfig(() => ({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // `globDirectory` intentionally left to its default (the project root): the
  // helper derives glob patterns for `.next/static/**` and `public/**` relative
  // to it, so overriding it silently drops almost everything from the precache.
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
}));
